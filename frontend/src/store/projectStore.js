import { create } from 'zustand';
import { api } from '../api/client';
import { useEditorStore } from './editorStore';

// 保存队列：串行化所有自动保存请求，避免快速切换文件时的竞态
let saveQueue = Promise.resolve();
let autosaveTimer = null;

async function doSave(snapshot, keepalive) {
  const store = useProjectStore;
  try {
    await api(`/api/projects/${snapshot.projectId}/files/${snapshot.fileId}`, {
      method: 'PUT',
      body: { content: snapshot.code },
      keepalive,
    });
    store.getState().markFileContent(snapshot.fileId, snapshot.code);
    const editor = useEditorStore.getState();
    // 仅当编辑器内容仍与该快照一致时更新“已保存”基准，避免覆盖新文件的状态
    if (editor.code === snapshot.code) editor.markSaved();
    editor.setSavedAt(Date.now()); // 触发编辑器右上角“保存成功”绿点闪烁
    store.setState({ autosaveError: null });
  } catch (err) {
    if (!keepalive) {
      store.setState({ autosaveError: err.message || '自动保存失败' });
    }
  }
}

function enqueueSave(snapshot, keepalive) {
  saveQueue = saveQueue.then(() => doSave(snapshot, keepalive)).catch(() => {});
  return saveQueue;
}

// 项目 / 文件管理状态（文件夹式工作区）
export const useProjectStore = create((set, get) => ({
  projects: [],
  loadingProjects: false,
  environments: [], // 自定义 Python 环境列表
  currentProject: null,
  files: [],
  loadingFiles: false,
  currentFileId: null,
  autosaveError: null,

  fetchEnvironments: async () => {
    const data = await api('/api/environments');
    set({ environments: data.environments });
    return data.environments;
  },

  bindEnvironment: async (projectId, environmentId) => {
    const data = await api(`/api/projects/${projectId}/environment`, {
      method: 'PUT',
      body: { environment_id: environmentId },
    });
    set((s) => ({
      currentProject:
        s.currentProject?.id === projectId
          ? { ...s.currentProject, environment_id: data.project.environment_id }
          : s.currentProject,
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, environment_id: data.project.environment_id } : p,
      ),
    }));
    return data.project;
  },

  fetchProjects: async () => {
    set({ loadingProjects: true });
    try {
      const data = await api('/api/projects');
      set({ projects: data.projects, loadingProjects: false });
    } catch (err) {
      set({ loadingProjects: false });
      throw err;
    }
  },

  createProject: async (name) => {
    const data = await api('/api/projects', { method: 'POST', body: { name } });
    set((s) => ({ projects: [data.project, ...s.projects] }));
    return data.project;
  },

  deleteProject: async (id) => {
    await api(`/api/projects/${id}`, { method: 'DELETE' });
    if (get().currentProject?.id === id) {
      useEditorStore.getState().reset();
      set({ currentProject: null, files: [], currentFileId: null });
    }
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));
  },

  openProject: async (project) => {
    // 先保存上一个文件，再切换（防 iPad 意外关闭丢内容）
    await get().saveCurrent();
    set({ currentProject: project, files: [], currentFileId: null, loadingFiles: true, autosaveError: null });
    try {
      const data = await api(`/api/projects/${project.id}/files`);
      set({ files: data.files, loadingFiles: false });
      const first = data.files[0];
      if (first) {
        useEditorStore.getState().setCode(first.content ?? '');
        useEditorStore.getState().markSaved();
        set({ currentFileId: first.id });
      }
    } catch (err) {
      set({ loadingFiles: false });
      throw err;
    }
  },

  closeProject: async () => {
    await get().saveCurrent();
    useEditorStore.getState().reset();
    set({ currentProject: null, files: [], currentFileId: null });
  },

  openFile: async (file) => {
    // 媒体文件不进编辑器（由 MediaPreview 处理）
    if (file.kind && file.kind !== 'text') return;
    if (get().currentFileId === file.id) return;
    await get().saveCurrent(); // 切换文件前自动保存
    useEditorStore.getState().setCode(file.content ?? '');
    useEditorStore.getState().markSaved();
    set({ currentFileId: file.id });
  },

  // 上传成功后的本地追加（避免整表重新拉取）
  appendFile: (file) => set((s) => ({ files: [...s.files, file] })),

  // 关闭当前标签页（不删除文件，仅退出编辑状态）
  closeCurrentFile: async () => {
    if (!get().currentFileId) return;
    await get().saveCurrent();
    useEditorStore.getState().setCode('');
    useEditorStore.getState().markSaved();
    set({ currentFileId: null });
  },

  createFile: async (name) => {
    const pid = get().currentProject?.id;
    if (!pid) return null;
    const data = await api(`/api/projects/${pid}/files`, {
      method: 'POST',
      body: { name, content: '' },
    });
    set((s) => ({ files: [...s.files, data.file] }));
    await get().openFile(data.file);
    return data.file;
  },

  deleteFile: async (fileId) => {
    const pid = get().currentProject?.id;
    if (!pid) return;
    await api(`/api/projects/${pid}/files/${fileId}`, { method: 'DELETE' });
    const wasCurrent = get().currentFileId === fileId;
    if (wasCurrent) {
      useEditorStore.getState().setCode('');
      useEditorStore.getState().markSaved();
    }
    set((s) => ({
      files: s.files.filter((f) => f.id !== fileId),
      currentFileId: wasCurrent ? null : s.currentFileId,
    }));
    // 删除当前文件后自动打开下一个
    const remaining = get().files;
    if (wasCurrent && remaining.length > 0) {
      await get().openFile(remaining[0]);
    }
  },

  renameFile: async (fileId, name) => {
    const pid = get().currentProject?.id;
    if (!pid) return null;
    const data = await api(`/api/projects/${pid}/files/${fileId}`, {
      method: 'PATCH',
      body: { name },
    });
    set((s) => ({
      files: s.files.map((f) => (f.id === fileId ? { ...f, ...data.file } : f)),
    }));
    return data.file;
  },

  markFileContent: (fileId, content) =>
    set((s) => ({
      files: s.files.map((f) => (f.id === fileId ? { ...f, content } : f)),
    })),

  // 自动保存当前文件（带快照，串行执行）
  saveCurrent: (opts = {}) => {
    const editor = useEditorStore.getState();
    const fileId = get().currentFileId;
    const project = get().currentProject;
    if (!fileId || !project) return Promise.resolve();
    if (editor.code === editor.savedCode) return Promise.resolve();
    return enqueueSave(
      {
        fileId,
        projectId: project.id,
        code: editor.code,
      },
      Boolean(opts.keepalive),
    );
  },

  // 输入停顿 2 秒后的防抖自动保存
  scheduleAutosave: () => {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      get().saveCurrent();
    }, 2000);
  },

  resetAll: () =>
    set({
      projects: [],
      environments: [],
      currentProject: null,
      files: [],
      currentFileId: null,
      autosaveError: null,
    }),
}));

// 当前文件选择器（引用稳定，避免多余渲染）
export const selectCurrentFile = (s) =>
  s.files.find((f) => f.id === s.currentFileId) ?? null;
