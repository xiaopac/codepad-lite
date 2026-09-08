import { motion } from 'framer-motion';

// 教程目录：44pt+ 触控条目、霓虹高亮激活项
// 拖拽判定由 WikiSidebar 统一处理：可滚动时保留原生滚动，无滚动空间时可拖拽窗口
export default function WikiDirectory({ chapters, activeId, onSelect }) {
  return (
    <nav
      className="wiki-scroll min-h-0 flex-1 overflow-y-auto scroll-touch overscroll-contain px-1 py-2"
      style={{ touchAction: 'pan-y' }}
      onPointerDownCapture={(e) => {
        // 可滚动时保留原生滚动；内容不足一屏（无滚动空间）时交给面板拖拽
        if (e.currentTarget.scrollHeight > e.currentTarget.clientHeight + 2) e.stopPropagation();
      }}
    >
      <ul className="space-y-1">
        {chapters.map((ch, i) => {
          const active = ch.id === activeId;
          return (
            <motion.li
              key={ch.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3), ease: 'easeOut' }}
            >
              <button
                onClick={() => onSelect(ch.id)}
                className={`flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-3 text-left text-base leading-relaxed transition ${
                  active
                    ? 'border border-cyan-400/40 bg-cyan-400/10 font-medium text-cyan-200 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                    : 'border border-transparent text-slate-300 hover:bg-white/5 hover:text-slate-100'
                }`}
              >
                <span
                  className={`shrink-0 font-mono text-[11px] ${
                    active ? 'text-cyan-300' : 'text-slate-500'
                  }`}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1 truncate">{ch.title}</span>
                {active && (
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400"
                    style={{ boxShadow: '0 0 6px rgba(0,240,255,0.9)' }}
                  />
                )}
              </button>
            </motion.li>
          );
        })}
      </ul>
    </nav>
  );
}
