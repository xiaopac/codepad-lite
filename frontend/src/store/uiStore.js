import { create } from 'zustand';
import { api } from '../api/client';
import { useEditorStore } from './editorStore';
import { useProjectStore, selectCurrentFile } from './projectStore';
import { runLanguageFromName } from '../utils/language';

const initialOutputHeight = () => {
  const vh = (typeof window !== 'undefined' && (window.visualViewport?.height || window.innerHeight)) || 800;
  return Math.max(200, Math.min(460, Math.round(vh * 0.34)));
};

// UI 状态：运行结果、stdin 输入、终端式控制台尺寸/折叠、运行中标记、个人设置面板
export const useUiStore = create((set, get) => ({
  stdin: '',
  result: null,
  resultAt: 0, // 结果产生时间戳（用于成功绿光闪烁的重触发）
  runError: null,
  running: false,
  outputOpen: true,
  profileOpen: false,

  setProfileOpen: (v) => set({ profileOpen: v }),
  outputHeight: initialOutputHeight(),

  setStdin: (v) => set({ stdin: v }),
  setOutputHeight: (h) => set({ outputHeight: h }),
  toggleOutput: () => set((s) => ({ outputOpen: !s.outputOpen })),

  // 清空控制台（输出 + 输入一起清掉）
  clearConsole: () => set({ stdin: '', result: null, runError: null, resultAt: 0 }),

  // 运行当前文件（c / cpp / python 可运行）
  // 输入与输出合并为终端式控制台：stdin 在运行时一次性发送
  runCode: async () => {
    if (get().running) return;
    const file = selectCurrentFile(useProjectStore.getState());
    if (!file) return;
    const language = runLanguageFromName(file.name);
    if (!language) return;

    const code = useEditorStore.getState().code;
    const stdin = get().stdin;
    // Python 运行时绑定项目所选的自定义环境（若无绑定则走默认运行时）
    const project = useProjectStore.getState().currentProject;
    const environmentId =
      language === 'python' ? project?.environment_id ?? undefined : undefined;

    set({ running: true, result: null, runError: null, outputOpen: true });
    try {
      const data = await api('/api/execute', {
        method: 'POST',
        body: { language, code, stdin, environment_id: environmentId },
      });
      set({ result: data, resultAt: Date.now() });
    } catch (err) {
      set({ runError: err.message || '执行失败' });
    } finally {
      set({ running: false });
    }
  },
}));
