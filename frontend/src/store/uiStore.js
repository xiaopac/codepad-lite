import { create } from 'zustand';
import { api } from '../api/client';
import { useEditorStore } from './editorStore';
import { useProjectStore, selectCurrentFile } from './projectStore';
import { languageFromName } from '../utils/language';

const initialOutputHeight = () => {
  const vh = (typeof window !== 'undefined' && (window.visualViewport?.height || window.innerHeight)) || 800;
  return Math.max(160, Math.min(420, Math.round(vh * 0.3)));
};

// UI 状态：运行结果、stdin 输入、输出面板尺寸/折叠、运行中标记
export const useUiStore = create((set, get) => ({
  stdin: '',
  result: null,
  resultAt: 0, // 结果产生时间戳（用于成功绿光闪烁的重触发）
  runError: null,
  running: false,
  outputOpen: true,
  outputTab: 'output', // 'output' | 'stdin'
  outputHeight: initialOutputHeight(),

  setStdin: (v) => set({ stdin: v }),
  setOutputTab: (t) => set({ outputTab: t }),
  setOutputHeight: (h) => set({ outputHeight: h }),
  toggleOutput: () => set((s) => ({ outputOpen: !s.outputOpen })),

  // 运行当前文件（语言由扩展名推断）
  runCode: async () => {
    if (get().running) return;
    const file = selectCurrentFile(useProjectStore.getState());
    if (!file) return;
    const language = languageFromName(file.name);
    if (!language) return;

    const code = useEditorStore.getState().code;
    const stdin = get().stdin;

    set({ running: true, result: null, runError: null, outputOpen: true, outputTab: 'output' });
    try {
      const data = await api('/api/execute', {
        method: 'POST',
        body: { language, code, stdin },
      });
      set({ result: data, resultAt: Date.now() });
    } catch (err) {
      set({ runError: err.message || '执行失败' });
    } finally {
      set({ running: false });
    }
  },
}));
