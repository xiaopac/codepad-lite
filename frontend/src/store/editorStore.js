import { create } from 'zustand';

const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 24;

// 编辑器状态：当前代码、字号、脏标记（用于自动保存判断）、保存成功时间戳（绿点闪烁）
export const useEditorStore = create((set, get) => ({
  code: '',
  savedCode: '',
  fontSize: 16, // 需求锁定：移动端默认 16px
  savedAt: 0, // 最近一次保存成功的时间戳

  setCode: (code) => set({ code }),
  setFontSize: (size) =>
    set({ fontSize: Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, size)) }),
  markSaved: () => set({ savedCode: get().code }),
  setSavedAt: (ts) => set({ savedAt: ts }),
  isDirty: () => get().code !== get().savedCode,
  reset: () => set({ code: '', savedCode: '', savedAt: 0 }),
}));
