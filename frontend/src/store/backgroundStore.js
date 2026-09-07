import { create } from 'zustand';
import { api } from '../api/client';

const DEFAULT_SETTINGS = { scale: 100, contrast: 100, opacity: 18, posX: 50, posY: 30 };

// 编辑器背景：图片 dataURL + 调整参数（缩放/对比度/透明度/位置）
export const useBackgroundStore = create((set, get) => ({
  image: null,
  settings: { ...DEFAULT_SETTINGS },
  loaded: false,
  editMode: false, // 控制面板打开时允许拖动图片

  setEditMode: (v) => set({ editMode: v }),

  load: async () => {
    try {
      const data = await api('/api/user/background');
      set({ image: data.image, settings: { ...DEFAULT_SETTINGS, ...data.settings }, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  // 本地即时更新（拖拽/滑杆所见即所得）
  patchSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

  // 持久化设置（防抖后调用）
  saveSettings: async () => {
    try {
      const data = await api('/api/user/background/settings', {
        method: 'PUT',
        body: get().settings,
      });
      set({ settings: { ...DEFAULT_SETTINGS, ...data.settings } });
    } catch {
      /* 保存失败不打断操作 */
    }
  },

  // 上传新图（base64 dataURL）
  uploadImage: async (dataUrl) => {
    const data = await api('/api/user/background', { method: 'PUT', body: { image: dataUrl } });
    set({ image: dataUrl, settings: { ...DEFAULT_SETTINGS, ...data.settings } });
  },

  removeImage: async () => {
    await api('/api/user/background', { method: 'DELETE' });
    set({ image: null });
  },
}));
