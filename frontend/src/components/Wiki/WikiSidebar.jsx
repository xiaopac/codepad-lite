import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, animate, motion, useMotionValue } from 'framer-motion';
import WikiTabs from './WikiTabs';
import WikiDirectory from './WikiDirectory';
import WikiContent from './WikiContent';
import { cppWikiData } from './wikiData/cppWikiData';
import { pythonWikiData } from './wikiData/pythonWikiData';
import { cWikiData } from './wikiData/cWikiData';

const POS_KEY = 'codepad-wiki-pos';
const SAFE_X = 8;                    // 边缘留白
const SAFE_TOP = 8;
const SAFE_BOTTOM = 8;

// 语言标签：C++ 已上线；Python / C 预留
const TABS = [
  { id: 'cpp', label: 'C++', enabled: true, data: cppWikiData },
  { id: 'python', label: 'Python', enabled: false, data: pythonWikiData },
  { id: 'c', label: 'C', enabled: false, data: cWikiData },
];

// 面板尺寸：iPad 横屏 320pt / 竖屏 280pt；高度 85% 视口
function panelSize() {
  const w = typeof window !== 'undefined' && window.matchMedia('(orientation: landscape)').matches ? 320 : 280;
  const h = typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.85) : 520;
  return { w, h };
}

function loadSavedPos() {
  try {
    const p = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) return { x: p.x, y: p.y };
  } catch { /* 损坏的存储数据忽略 */ }
  return null;
}

// 钳制到可视区（考虑安全区），防止拖出屏幕或换向时丢失
function clampPos(p) {
  const { w, h } = panelSize();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxX = Math.max(SAFE_X, vw - w - SAFE_X);
  const maxY = Math.max(SAFE_TOP, vh - h - SAFE_BOTTOM);
  return {
    x: Math.min(Math.max(p.x, SAFE_X), maxX),
    y: Math.min(Math.max(p.y, SAFE_TOP), maxY),
  };
}

function defaultPos() {
  return { x: 12, y: Math.round(window.innerHeight * 0.075) };
}

// ── 可拖拽面板（每次打开重新挂载，从保存的位置滑入）──
function WikiPanel({ onClose }) {
  const constraintsRef = useRef(null);
  const panelRef = useRef(null);
  const { w } = panelSize();

  const saved = useMemo(() => clampPos(loadSavedPos() || defaultPos()), []);
  const x = useMotionValue(-w - 60); // 从屏幕左侧外滑入
  const y = useMotionValue(saved.y);

  const [tab, setTab] = useState('cpp');
  const [activeId, setActiveId] = useState('intro');
  const current = TABS.find((t) => t.id === tab);

  // 入场：滑到记忆位置
  useEffect(() => {
    const controls = animate(x, saved.x, { type: 'spring', stiffness: 300, damping: 30 });
    return () => controls.stop();
  }, [x, saved.x]);

  // Esc 关闭
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // 视口变化（旋转 iPad 等）：把面板拉回可视区
  useEffect(() => {
    const onResize = () => {
      const r = panelRef.current?.getBoundingClientRect();
      if (!r) return;
      const c = clampPos({ x: r.left, y: r.top });
      animate(x, c.x, { duration: 0.22, ease: 'easeOut' });
      animate(y, c.y, { duration: 0.22, ease: 'easeOut' });
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [x, y]);

  // 拖拽结束：钳制 + 吸附 + 写入 localStorage（下次打开恢复）
  const handleDragEnd = () => {
    const r = panelRef.current?.getBoundingClientRect();
    if (!r) return;
    const c = clampPos({ x: r.left, y: r.top });
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(c));
    } catch { /* 隐私模式等写入失败忽略 */ }
    animate(x, c.x, { type: 'spring', stiffness: 420, damping: 34 });
    animate(y, c.y, { type: 'spring', stiffness: 420, damping: 34 });
  };

  const switchTab = (id) => {
    setTab(id);
    const next = TABS.find((t) => t.id === id);
    if (next?.enabled && next.data.chapters.length > 0) {
      setActiveId(next.data.chapters[0].id);
    }
  };

  return (
    <div ref={constraintsRef} className="fixed inset-0 z-[95]">
      {/* 背景遮罩：点击关闭 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
      />

      {/* 可拖拽面板：dragMomentum 关闭防惯性；约束在遮罩（视口）内 */}
      <motion.div
        ref={panelRef}
        drag
        dragConstraints={constraintsRef}
        dragMomentum={false}
        dragElastic={0.08}
        onDragEnd={handleDragEnd}
        style={{ x, y, height: '85dvh', touchAction: 'none' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16 }}
        onClick={(e) => e.stopPropagation()}
        className="absolute left-0 top-0 flex w-[280px] flex-col overflow-hidden rounded-r-2xl border-r border-cyan-400/40 bg-[rgba(10,10,15,0.92)] p-4 shadow-[0_0_44px_rgba(0,240,255,0.16)] backdrop-blur-xl landscape:w-[320px]"
      >
        {/* 标题区（可拖拽） */}
        <div className="flex shrink-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 text-base shadow-[0_0_10px_rgba(0,240,255,0.25)]">
            📚
          </span>
          <h2 className="gradient-text min-w-0 flex-1 truncate text-base font-bold tracking-wide">
            编程 Wiki
          </h2>
          <button
            onClick={onClose}
            aria-label="关闭 Wiki"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>
        <p className="mt-1.5 shrink-0 pl-1 text-[10px] leading-relaxed text-slate-600">
          ⠿ 拖动标题 / 空白处可移动面板，位置自动记忆
        </p>

        {/* 语言标签（可拖拽） */}
        <div className="mt-2 shrink-0">
          <WikiTabs tabs={TABS} active={tab} onChange={switchTab} />
        </div>

        {/* 上部 45% 目录 + 下部 55% 内容（各自独立滚动） */}
        <div className="mt-2 flex min-h-0 flex-1 flex-col">
          {current?.enabled ? (
            <>
              <div className="flex h-[45%] min-h-[132px] shrink-0 flex-col">
                <p className="shrink-0 px-2 pb-1 text-[10px] uppercase tracking-widest text-slate-500">
                  目录
                </p>
                <WikiDirectory
                  chapters={current.data.chapters}
                  activeId={activeId}
                  onSelect={setActiveId}
                />
              </div>
              <div className="mx-2 my-1.5 h-px shrink-0 bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
              <div className="flex min-h-0 flex-1 flex-col">
                <p className="shrink-0 px-2 pb-1 text-[10px] uppercase tracking-widest text-slate-500">
                  内容
                </p>
                <WikiContent chapter={current.data.chapters.find((c) => c.id === activeId)} />
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
              <span className="text-4xl">🚧</span>
              <p className="text-sm text-slate-300">「{current?.label}」教程即将上线</p>
              <p className="text-xs text-slate-500">敬请期待，当前可先学习 C++ 教程</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// 全局 Wiki 侧边栏：createPortal 到 body，任何路由页面可用
export default function WikiSidebar({ open, onClose }) {
  return createPortal(
    <AnimatePresence>{open && <WikiPanel key="wiki-panel" onClose={onClose} />}</AnimatePresence>,
    document.body,
  );
}
