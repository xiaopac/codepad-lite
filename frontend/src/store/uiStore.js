import { create } from 'zustand';
import { api } from '../api/client';
import { useEditorStore } from './editorStore';
import { useProjectStore, selectCurrentFile } from './projectStore';
import { runLanguageFromName } from '../utils/language';

const initialOutputHeight = () => {
  const vh = (typeof window !== 'undefined' && (window.visualViewport?.height || window.innerHeight)) || 800;
  return Math.max(200, Math.min(460, Math.round(vh * 0.34)));
};

// UI 状态：运行结果、stdin 输入、终端式控制台尺寸/折叠、交互终端、运行中标记、个人设置面板
export const useUiStore = create((set, get) => ({
  stdin: '',
  result: null,
  resultAt: 0, // 结果产生时间戳（用于成功绿光闪烁的重触发）
  runError: null,
  running: false,
  outputOpen: true,
  profileOpen: false,

  // ── 交互式终端（工作区底部面板，所有用户可用） ──
  termOpen: false,
  termSession: null, // { id, language, file } | null
  termStatus: 'idle', // idle | starting | connecting | running | closed | error
  termStatusText: '',
  termHeight: 320,
  termWinOpen: false, // pygame 程序窗口浮层（noVNC 画面）

  setProfileOpen: (v) => set({ profileOpen: v }),
  outputHeight: initialOutputHeight(),

  setStdin: (v) => set({ stdin: v }),
  setOutputHeight: (h) => set({ outputHeight: h }),
  toggleOutput: () => set((s) => ({ outputOpen: !s.outputOpen })),

  setTermOpen: (v) => set({ termOpen: v }),
  setTermHeight: (h) => set({ termHeight: h }),
  setTermStatus: (status, text = '') => set({ termStatus: status, termStatusText: text }),
  setTermWinOpen: (v) => set({ termWinOpen: v }),
  // 停止终端：清掉会话（TerminalScreen 随之关闭 WebSocket → 沙箱回收进程），并关闭程序窗口
  stopTerminal: () =>
    set({ termSession: null, termStatus: 'idle', termStatusText: '', termWinOpen: false }),

  // 清空控制台（输出 + 输入一起清掉）
  clearConsole: () => set({ stdin: '', result: null, runError: null, resultAt: 0 }),

  // 启动交互终端：取当前文件的语言与代码，登记会话后由 TerminalScreen 连接
  startTerminal: async () => {
    // 已有会话在跑/已结束 → 点按钮 = 重新展开终端面板（不重复建会话）
    if (['starting', 'connecting', 'running'].includes(get().termStatus) && get().termSession) {
      set({ termOpen: true, outputOpen: false });
      return;
    }
    if (['starting', 'connecting', 'running'].includes(get().termStatus)) return;
    const file = selectCurrentFile(useProjectStore.getState());
    if (!file) return;
    const language = runLanguageFromName(file.name);
    if (!language) return;
    const code = useEditorStore.getState().code;

    // 终端弹出时自动收起批处理控制台，给终端让出空间
    set({
      termOpen: true,
      outputOpen: false,
      termStatus: 'starting',
      termStatusText: '正在创建终端会话…',
    });
    try {
      const data = await api('/api/terminal/sessions', {
        method: 'POST',
        body: { language, code },
      });
      set({
        termSession: { id: data.session_id, language, file: file.name },
        termStatus: 'connecting',
        termStatusText: '正在连接…',
      });
    } catch (err) {
      set({
        termSession: null,
        termStatus: 'error',
        termStatusText: err.message || '终端启动失败',
      });
    }
  },

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
