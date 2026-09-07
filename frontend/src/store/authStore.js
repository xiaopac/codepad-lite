import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../api/client';

// 认证状态：token + 用户信息持久化在 localStorage（需求锁定）
export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,

      setAuth: (token, user) => set({ token, user }),
      clearAuth: () => set({ token: null, user: null }),

      // 应用启动时用已存 token 拉取当前用户信息（校验 token 有效性）
      boot: async () => {
        try {
          const data = await api('/api/user/me');
          set({ user: data.user });
        } catch {
          set({ token: null, user: null });
        }
      },
    }),
    { name: 'codepad-lite-auth' },
  ),
);
