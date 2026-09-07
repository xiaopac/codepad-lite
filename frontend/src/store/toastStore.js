import { create } from 'zustand';

let seq = 0;

// 全局 Toast 队列：从右侧滑入，停留 2 秒后淡出滑走
export const useToastStore = create((set, get) => ({
  toasts: [],
  push: (message, type = 'info') => {
    const id = ++seq;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => get().dismiss(id), 2000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  info: (message) => useToastStore.getState().push(message, 'info'),
  success: (message) => useToastStore.getState().push(message, 'success'),
  error: (message) => useToastStore.getState().push(message, 'error'),
};
