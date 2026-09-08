import { create } from 'zustand';
import { useAuthStore } from './authStore';

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');

// 带鉴权的原始字节流请求（<img>/<audio>/<video> 无法带 Authorization 头，故用 blob）
async function apiBlob(path) {
  const token = useAuthStore.getState().token;
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let message = `加载失败（HTTP ${res.status}）`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch { /* 忽略 */ }
    throw new Error(message);
  }
  const blob = await res.blob();
  return { blob, contentType: res.headers.get('content-type') };
}

// 媒体预览状态：打开文件 → 拉取 blob → 生成 objectURL
export const useMediaStore = create((set, get) => ({
  file: null,
  url: null,
  loading: false,
  error: null,

  open: async (file) => {
    set({ file, url: null, loading: true, error: null });
    try {
      const { blob } = await apiBlob(`/api/projects/${file.projectId}/files/${file.id}/media`);
      const url = URL.createObjectURL(blob);
      set({ url, loading: false });
    } catch (err) {
      set({ error: err.message || '加载失败', loading: false });
    }
  },

  close: () => {
    const url = get().url;
    if (url) URL.revokeObjectURL(url);
    set({ file: null, url: null, loading: false, error: null });
  },
}));
