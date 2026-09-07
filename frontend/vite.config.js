import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Monaco 的 worker 必须以 ES 模块形式打包
  worker: { format: 'es' },
  server: {
    host: true,
    port: 5173,
    // 本地开发时把 /api 代理到后端，避免 CORS
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    // monaco-editor 体积较大，调高警告阈值
    chunkSizeWarningLimit: 6000,
  },
});
