import { useAuthStore } from '../store/authStore';

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * 统一 API 请求封装：
 * - 自动附带 Authorization: Bearer <token>
 * - 401 时自动清除本地登录态（token 过期/无效）
 * - 非 2xx 抛出带后端 error 信息的 ApiError
 */
export async function api(path, { method = 'GET', body, keepalive = false } = {}) {
  const { token, clearAuth } = useAuthStore.getState();
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      keepalive, // 页面关闭时的自动保存使用 keepalive 请求
    });
  } catch {
    throw new ApiError('网络连接失败，请检查网络后重试', 0);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/api/auth/')) {
      clearAuth();
    }
    // 响应拦截：统一错误信息（429 限流、5xx 兜底都给友好文案）
    let message = (data && data.error) || `请求失败（HTTP ${res.status}）`;
    if (res.status === 429) message = '操作太频繁了，请稍后再试';
    if (res.status >= 500) message = '服务器开小差了，请稍后再试';
    throw new ApiError(message, res.status);
  }
  return data;
}
