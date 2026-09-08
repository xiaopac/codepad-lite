import { create } from 'zustand';
import { api } from '../api/client';

// 存储空间：配额/已用/百分比（默认 50MB/用户）
export const useStorageStore = create((set) => ({
  data: null,
  load: async () => {
    try {
      const data = await api('/api/user/storage');
      set({ data });
    } catch {
      /* 静默失败，界面保持上次数据 */
    }
  },
  clear: () => set({ data: null }),
}));
