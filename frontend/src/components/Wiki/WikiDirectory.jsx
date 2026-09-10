import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// 分支式教程目录：章节（可展开/收起）→ 小节（点击阅读）
// 默认全部展开，让新手一眼看到完整知识树；激活小节自动滚动到可视区
export default function WikiDirectory({ chapters, activeSectionId, onSelect }) {
  const [closed, setClosed] = useState(() => new Set());
  const activeRef = useRef(null);

  // 激活项变化时滚动到可视区（nearest，不打扰外部滚动）
  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [activeSectionId]);

  const toggleChapter = (id) => {
    setClosed((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <nav
      className="wiki-scroll min-h-0 flex-1 overflow-y-auto scroll-touch overscroll-contain px-1 py-2"
      style={{ touchAction: 'pan-y' }}
    >
      <ul className="space-y-0.5">
        {chapters.map((ch, ci) => {
          const isOpen = !closed.has(ch.id);
          // 编号：简介（第 0 项）显示 ★ 不计号；正文章节 01…08 与标题"第X章"一致
          const chNum = ci === 0 ? '★' : String(ci).padStart(2, '0');
          return (
            <li key={ch.id}>
              {/* 章节头 */}
              <button
                onClick={() => toggleChapter(ch.id)}
                className="flex min-h-[44px] w-full items-center gap-2 rounded-lg px-2.5 text-left transition hover:bg-white/5"
              >
                <span
                  className={`shrink-0 text-[10px] text-slate-500 transition-transform duration-200 ${
                    isOpen ? 'rotate-90' : ''
                  }`}
                >
                  ▶
                </span>
                <span className={`shrink-0 font-mono text-[11px] ${ci === 0 ? 'text-cyan-400' : 'text-slate-500'}`}>
                  {chNum}
                </span>
                <span className="min-w-0 flex-1 truncate text-base font-semibold text-slate-200">
                  {ch.title}
                </span>
                <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] text-slate-500">
                  {ch.sections.length} 节
                </span>
              </button>

              {/* 小节（分支） */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                    className="overflow-hidden"
                  >
                    {ch.sections.map((s, si) => {
                      const active = s.id === activeSectionId;
                      return (
                        <li key={s.id} className="ml-4 border-l border-white/10 pl-2">
                          <button
                            ref={active ? activeRef : null}
                            onClick={() => onSelect(s.id)}
                            className={`flex min-h-[42px] w-full items-center gap-2 rounded-lg px-2.5 text-left text-[15px] leading-relaxed transition ${
                              active
                                ? 'border border-cyan-400/40 bg-cyan-400/10 font-medium text-cyan-200 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                                : 'border border-transparent text-slate-300 hover:bg-white/5 hover:text-slate-100'
                            }`}
                          >
                            <span
                              className={`shrink-0 font-mono text-[10px] ${
                                active ? 'text-cyan-300' : 'text-slate-600'
                              }`}
                            >
                              {ci === 0 ? '·' : `${ci}-${si + 1}`}
                            </span>
                            <span className="min-w-0 flex-1 truncate">{s.title}</span>
                            {active && (
                              <span
                                className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400"
                                style={{ boxShadow: '0 0 6px rgba(0,240,255,0.9)' }}
                              />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </motion.ul>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
