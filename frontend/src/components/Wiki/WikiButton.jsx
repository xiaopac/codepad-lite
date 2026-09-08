import { motion } from 'framer-motion';

// 左下角 Wiki 书签按钮：56pt 圆形毛玻璃 + 霓虹青蓝书本图标
// 固定位置（折中方案：图标不拖拽，避免用户丢失入口；侧边栏可拖拽）
export default function WikiButton({ open, onClick }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.4 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      aria-label="打开编程 Wiki"
      title="编程 Wiki"
      className="fixed z-[70] flex h-14 w-14 items-center justify-center rounded-full border border-cyan-400/50 bg-[#0a0a12]/70 shadow-[0_0_18px_rgba(0,240,255,0.35)] backdrop-blur-xl transition-shadow hover:shadow-[0_0_28px_rgba(0,240,255,0.55)]"
      style={{
        left: 'calc(env(safe-area-inset-left, 0px) + 16px)',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        touchAction: 'manipulation',
      }}
    >
      {/* 书本 SVG（霓虹青蓝 + 渐变书脊） */}
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={open ? 'text-cyan-300' : 'text-cyan-200'}
      >
        <defs>
          <linearGradient id="wiki-book-fg" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#00f0ff" />
            <stop offset="1" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        <path
          d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v15.5H6.5A2.5 2.5 0 0 0 4 20V4.5z"
          stroke="url(#wiki-book-fg)"
          strokeWidth="1.6"
          strokeLinejoin="round"
          style={{ filter: 'drop-shadow(0 0 4px rgba(0,240,255,0.6))' }}
        />
        <path
          d="M4 20a2.5 2.5 0 0 1 2.5-2.5H20"
          stroke="url(#wiki-book-fg)"
          strokeWidth="1.6"
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 4px rgba(0,240,255,0.6))' }}
        />
        <path d="M9 6h5M9 9h5M9 12h3" stroke="#00f0ff" strokeWidth="1.3" strokeLinecap="round" opacity="0.75" />
      </svg>
      {open && (
        <motion.span
          layoutId="wiki-button-dot"
          className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border border-cyan-300/60 bg-cyan-400"
          style={{ boxShadow: '0 0 8px rgba(0,240,255,0.9)' }}
        />
      )}
    </motion.button>
  );
}
