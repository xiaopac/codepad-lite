/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // ── 赛博科技感配色系统 ──────────────────────────────
      colors: {
        cyber: {
          cyan: '#00f0ff', // 主色调：霓虹青
          blue: '#0088ff', // 主色调：电子蓝
          purple: '#a855f7', // 辅色调：霓虹紫
          bg: '#0a0a0f', // 深空底色
          panel: '#0d0d16',
        },
      },
      // 全局字体：JetBrains Mono（等宽，UI 与编辑器统一）
      fontFamily: {
        sans: [
          "'JetBrains Mono'",
          'ui-monospace',
          'SF Mono',
          'Menlo',
          'Consolas',
          "'PingFang SC'",
          "'Microsoft YaHei'",
          'sans-serif',
        ],
        mono: [
          "'JetBrains Mono'",
          'ui-monospace',
          'SF Mono',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },
      // 霓虹光晕阴影
      boxShadow: {
        'neon-cyan': '0 0 20px rgba(0, 240, 255, 0.35)',
        'neon-cyan-lg': '0 0 32px rgba(0, 240, 255, 0.55)',
        'neon-purple': '0 0 20px rgba(168, 85, 247, 0.4)',
        'neon-purple-lg': '0 0 32px rgba(168, 85, 247, 0.6)',
        glass: '0 8px 32px rgba(0, 0, 0, 0.45)',
      },
      keyframes: {
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'spin-slow': 'spin-slow 8s linear infinite',
      },
    },
  },
  plugins: [],
};
