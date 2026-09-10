import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AnimatePresence,
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useMotionValueEvent,
} from 'framer-motion';
import WikiTabs from './WikiTabs';
import WikiDirectory from './WikiDirectory';
import WikiContent from './WikiContent';
import { cppWikiData } from './wikiData/cppWikiData';
import { pythonWikiData } from './wikiData/pythonWikiData';
import { cWikiData } from './wikiData/cWikiData';

const POS_KEY = 'codepad-wiki-pos';      // { x, y, w, h }
const RATIO_KEY = 'codepad-wiki-ratio';  // 0~1 目录占比
const MIN_W = 280;                       // 最小窗口宽
const MIN_H = 260;                       // 最小窗口高
const SPLIT_W = 560;                     // 宽度 ≥ 该值时目录/内容自动左右分栏
const MIN_RATIO = 0.25;
const MAX_RATIO = 0.72;
const SAFE = 8;

// 语言标签：C++ 已上线；Python / C 预留
const TABS = [
  { id: 'cpp', label: 'C++', enabled: true, data: cppWikiData },
  { id: 'python', label: 'Python', enabled: false, data: pythonWikiData },
  { id: 'c', label: 'C', enabled: false, data: cWikiData },
];

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function viewport() {
  return { vw: window.innerWidth, vh: window.innerHeight };
}

function defaultState() {
  const { vw, vh } = viewport();
  const landscape = window.matchMedia('(orientation: landscape)').matches;
  return {
    x: 12,
    y: Math.round(vh * 0.075),
    w: clamp(landscape ? 320 : 280, MIN_W, vw - SAFE * 2),
    h: clamp(Math.round(vh * 0.85), MIN_H, vh - SAFE * 2),
  };
}

function loadState() {
  const d = defaultState();
  try {
    const p = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.w) && Number.isFinite(p.h)) {
      const { vw, vh } = viewport();
      const w = clamp(p.w, MIN_W, vw - SAFE * 2);
      const h = clamp(p.h, MIN_H, vh - SAFE * 2);
      return {
        x: clamp(p.x, SAFE, Math.max(SAFE, vw - w - SAFE)),
        y: clamp(p.y, SAFE, Math.max(SAFE, vh - h - SAFE)),
        w,
        h,
      };
    }
  } catch { /* 损坏的存储忽略 */ }
  return d;
}

function loadRatio() {
  try {
    const r = Number(localStorage.getItem(RATIO_KEY));
    if (Number.isFinite(r) && r >= MIN_RATIO && r <= MAX_RATIO) return r;
  } catch { /* 忽略 */ }
  return 0.45;
}

// ── 可拖拽、可缩放的自由窗口（每次打开重新挂载，恢复上次位置/大小/分割比例）──
function WikiPanel({ onClose }) {
  const panelRef = useRef(null);
  const mainRef = useRef(null);
  const dragControls = useDragControls();

  const saved = useMemo(loadState, []);
  const savedRatio = useMemo(loadRatio, []);

  const x = useMotionValue(-saved.w - 60);
  const y = useMotionValue(saved.y);
  // 宽高用 motion value 驱动：拖拽缩放即时跟手（w.set），预设切换弹簧过渡（animate）
  const w = useMotionValue(saved.w);
  const h = useMotionValue(saved.h);
  const [size, setSize] = useState({ w: saved.w, h: saved.h });
  const [ratio, setRatio] = useState(savedRatio);
  const ratioRef = useRef(ratio);
  ratioRef.current = ratio;
  const sizeRef = useRef(size);
  sizeRef.current = size;
  // 视口尺寸变化时重建数值型拖拽约束（不用 ref 测量，避免约束错位导致拖不动）
  const [vp, setVp] = useState(() => ({ vw: window.innerWidth, vh: window.innerHeight }));

  // 宽高变化同步到 React 状态（驱动 分栏布局切换 / 拖拽约束）
  useMotionValueEvent(w, 'change', (v) => setSize((s) => ({ ...s, w: v })));
  useMotionValueEvent(h, 'change', (v) => setSize((s) => ({ ...s, h: v })));

  const [tab, setTab] = useState('cpp');
  const current = TABS.find((t) => t.id === tab);
  // 小节导航：目录是 章节 → 小节 的树；activeId 指向当前小节
  const [activeId, setActiveId] = useState(
    () => current?.data.chapters?.[0]?.sections?.[0]?.id || null,
  );

  // 扁平化小节序列（全局编号 + 上一节/下一节）
  const flatSections = useMemo(() => {
    const list = [];
    for (const ch of current?.data.chapters || []) {
      for (const s of ch.sections) {
        list.push({ ...s, number: String(list.length + 1).padStart(2, '0') });
      }
    }
    return list;
  }, [current]);
  const activeIndex = flatSections.findIndex((s) => s.id === activeId);
  const activeSection = activeIndex >= 0 ? flatSections[activeIndex] : null;
  const activeChapter = useMemo(() => {
    if (!activeSection) return null;
    return (current?.data.chapters || []).find((ch) => ch.sections.some((s) => s.id === activeSection.id)) || null;
  }, [current, activeSection]);
  const prevSection = activeIndex > 0 ? flatSections[activeIndex - 1] : null;
  const nextSection = activeIndex >= 0 && activeIndex < flatSections.length - 1 ? flatSections[activeIndex + 1] : null;

  const split = size.w >= SPLIT_W; // 宽窗口 → 目录左 / 内容右；窄窗口 → 上下结构

  // 数值型拖拽边界：面板始终完整落在可视区内
  const dragConstraints = useMemo(
    () => ({
      left: 0,
      top: 0,
      right: Math.max(0, vp.vw - size.w),
      bottom: Math.max(0, vp.vh - size.h),
    }),
    [vp.vw, vp.vh, size.w, size.h],
  );

  // 入场：从左侧滑入到记忆位置
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

  // 持久化：位置 + 大小 + 分割比例（override 用于在 React 渲染前保存目标尺寸）
  const persist = (override = null) => {
    const r = panelRef.current?.getBoundingClientRect();
    if (!r) return;
    const { vw, vh } = viewport();
    const w = clamp(override?.w ?? r.width, MIN_W, vw - SAFE * 2);
    const h = clamp(override?.h ?? r.height, MIN_H, vh - SAFE * 2);
    const st = {
      x: clamp(r.left, SAFE, Math.max(SAFE, vw - w - SAFE)),
      y: clamp(r.top, SAFE, Math.max(SAFE, vh - h - SAFE)),
      w,
      h,
    };
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(st));
      localStorage.setItem(RATIO_KEY, String(clamp(ratioRef.current, MIN_RATIO, MAX_RATIO)));
    } catch { /* 隐私模式等忽略 */ }
    return st;
  };

  // 视口变化（旋转 iPad / 键盘弹出）：更新约束 + 拉回可视区并收缩到合法尺寸
  useEffect(() => {
    const onResize = () => {
      setVp({ vw: window.innerWidth, vh: window.innerHeight });
      const r = panelRef.current?.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (r) {
        const nw = clamp(r.width, MIN_W, vw - SAFE * 2);
        const nh = clamp(r.height, MIN_H, vh - SAFE * 2);
        if (nw !== r.width || nh !== r.height) {
          w.set(nw);
          h.set(nh);
        }
        const nx = clamp(r.left, SAFE, Math.max(SAFE, vw - nw - SAFE));
        const ny = clamp(r.top, SAFE, Math.max(SAFE, vh - nh - SAFE));
        animate(x, nx, { duration: 0.22, ease: 'easeOut' });
        animate(y, ny, { duration: 0.22, ease: 'easeOut' });
      }
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [x, y]);

  // 拖拽结束：钳制 + 吸附 + 记忆
  const handleDragEnd = () => {
    const st = persist();
    if (!st) return;
    animate(x, st.x, { type: 'spring', stiffness: 420, damping: 34 });
    animate(y, st.y, { type: 'spring', stiffness: 420, damping: 34 });
  };

  // 手动派发窗口拖拽（framer v12 的捕获阶段监听拦不住 stopPropagation，
  // 因此由本函数精确决定哪些区域允许拖拽）：
  //  - 按钮 / 链接 / 缩放把手 / 分割条 → 不拖
  //  - 可滚动的目录/内容区 → 不拖（保留原生滚动）
  //  - 标题栏、标签行、空白处、无滚动空间的内容区 → 拖
  const startPanelDrag = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest('button, a, input, textarea, [data-nodrag]')) return;
    const scroller = e.target.closest('.wiki-scroll');
    if (scroller && scroller.scrollHeight > scroller.clientHeight + 2) return;
    dragControls.start(e);
  };

  // 右下角缩放把手：Windows 资源管理器式 —— 窗口左上角绝不动，
  // 向右/下最多生长到屏幕边缘（留 8px）即停，永不把窗口顶走。
  const startResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = sizeRef.current.w;
    const startH = sizeRef.current.h;
    const latest = { w: startW, h: startH };
    const move = (ev) => {
      const { vw, vh } = viewport();
      const maxW = Math.max(MIN_W, vw - SAFE - x.get());
      const maxH = Math.max(MIN_H, vh - SAFE - y.get());
      latest.w = clamp(startW + ev.clientX - startX, MIN_W, maxW);
      latest.h = clamp(startH + ev.clientY - startY, MIN_H, maxH);
      w.set(latest.w); // 即时跟手（无过渡）
      h.set(latest.h);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      persist(latest); // 只记忆位置与尺寸，不动窗口
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  // 一键尺寸预设：小（上下结构）/ 中（触发左右分栏）/ 大，切换时窗口不移动
  const SIZE_PRESETS = [
    { id: 's', label: '小', w: 300, h: 400 },
    { id: 'm', label: '中', w: 560, h: 440 },
    { id: 'l', label: '大', w: 720, h: 560 },
  ];
  const applyPreset = (p) => {
    const { vw, vh } = viewport();
    const maxW = Math.max(MIN_W, vw - SAFE - x.get());
    const maxH = Math.max(MIN_H, vh - SAFE - y.get());
    const next = { w: clamp(p.w, MIN_W, maxW), h: clamp(p.h, MIN_H, maxH) };
    // 弹簧过渡动画（窗口位置不动，尺寸平滑变化，越过 560 时自动分栏/合栏）
    const spring = { type: 'spring', stiffness: 240, damping: 28 };
    animate(w, next.w, spring);
    animate(h, next.h, spring);
    persist(next); // 立即按目标尺寸保存，窗口位置不变
  };

  // 目录/内容分割条：拖动调整占比（上下模式调高度，左右模式调宽度）
  const startDivider = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startAxis = split ? e.clientX : e.clientY;
    const startRatio = ratioRef.current;
    const move = (ev) => {
      const rect = mainRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cur = split ? ev.clientX : ev.clientY;
      const total = split ? rect.width : rect.height;
      if (total <= 0) return;
      const next = clamp(startRatio + (cur - startAxis) / total, MIN_RATIO, MAX_RATIO);
      setRatio(next);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      try {
        localStorage.setItem(RATIO_KEY, String(clamp(ratioRef.current, MIN_RATIO, MAX_RATIO)));
      } catch { /* 忽略 */ }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const switchTab = (id) => {
    setTab(id);
    const next = TABS.find((t) => t.id === id);
    if (next?.enabled && next.data.chapters.length > 0) {
      setActiveId(next.data.chapters[0].sections[0]?.id || null);
    }
  };

  const dividerCls = split
    ? 'cursor-col-resize border-x border-white/10 hover:border-cyan-400/40'
    : 'cursor-row-resize border-y border-white/10 hover:border-cyan-400/40';

  return (
    <div className="fixed inset-0 z-[95]">
      {/* 背景遮罩：点击关闭 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
      />

      {/* 自由窗口：手动派发拖拽（数值约束，方向全向）+ 右下角缩放（位置不动），位置/大小记忆 */}
      <motion.div
        ref={panelRef}
        drag
        dragControls={dragControls}
        dragListener={false}
        onPointerDown={startPanelDrag}
        dragConstraints={dragConstraints}
        dragMomentum={false}
        dragElastic={0.05}
        onDragEnd={handleDragEnd}
        style={{ x, y, width: w, height: h }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16 }}
        onClick={(e) => e.stopPropagation()}
        className="absolute left-0 top-0 flex select-none flex-col overflow-hidden rounded-2xl border border-cyan-400/40 bg-[rgba(10,10,15,0.92)] p-4 shadow-[0_0_44px_rgba(0,240,255,0.16)] backdrop-blur-xl"
      >
        {/* 标题区（抓取柄） */}
        <div
          className="flex shrink-0 cursor-grab items-center gap-2 active:cursor-grabbing"
          title="按住拖动窗口"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 text-base shadow-[0_0_10px_rgba(0,240,255,0.25)]">
            📚
          </span>
          <h2 className="gradient-text min-w-0 flex-1 truncate text-base font-bold tracking-wide">
            编程 Wiki
          </h2>
          {/* 一键尺寸：小 / 中（分栏）/ 大 */}
          <div className="flex shrink-0 items-center gap-1">
            {SIZE_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p)}
                className="flex h-8 items-center rounded-md bg-white/5 px-2 text-[11px] text-slate-400 transition hover:bg-white/10 hover:text-cyan-200"
                title={`切换为${p.label}窗口（${p.w}×${p.h}）`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            aria-label="关闭 Wiki"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>
        <p className="mt-1.5 shrink-0 pl-1 text-[10px] leading-relaxed text-slate-600">
          ⠿ 按住标题 / 空白处拖动窗口 · 右下角 ⤡ 缩放（窗口不移动）· 小/中/大 一键切换 · 中间分割条调整目录占比
        </p>

        {/* 语言标签 */}
        <div className="mt-2 shrink-0">
          <WikiTabs tabs={TABS} active={tab} onChange={switchTab} />
        </div>

        {/* 主体：宽窗口左右分栏，窄窗口上下分栏；分割条可拖 */}
        <div ref={mainRef} className={`mt-2 flex min-h-0 flex-1 ${split ? 'flex-row' : 'flex-col'}`}>
          {current?.enabled ? (
            <>
              <div
                className={`flex min-h-0 min-w-0 flex-col ${split ? '' : ''}`}
                style={split ? { flex: `0 0 ${Math.round(ratio * 100)}%` } : { flex: `0 0 ${Math.round(ratio * 100)}%` }}
              >
                <p className="shrink-0 px-2 pb-1 text-[10px] uppercase tracking-widest text-slate-500">
                  目录
                </p>
                <WikiDirectory
                  chapters={current.data.chapters}
                  activeSectionId={activeId}
                  onSelect={setActiveId}
                />
              </div>

              {/* 分割条 */}
              <div
                data-nodrag
                onPointerDown={startDivider}
                className={`${dividerCls} group flex shrink-0 items-center justify-center ${
                  split ? 'mx-1 w-2.5 flex-col' : 'my-1 h-2.5 flex-row'
                }`}
                title="拖动调整目录与内容比例"
              >
                <span
                  className={`rounded-full bg-slate-600 transition group-hover:bg-cyan-400 ${
                    split ? 'h-6 w-0.5' : 'h-0.5 w-6'
                  }`}
                  style={{ boxShadow: '0 0 6px rgba(0,240,255,0.4)' }}
                />
              </div>

              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <p className="shrink-0 px-2 pb-1 text-[10px] uppercase tracking-widest text-slate-500">
                  内容
                </p>
                <WikiContent
                  section={activeSection}
                  chapterTitle={activeChapter?.title}
                  prev={prevSection}
                  next={nextSection}
                  onNavigate={setActiveId}
                />
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

        {/* 右下角缩放把手 */}
        <div
          data-nodrag
          onPointerDown={startResize}
          className="absolute bottom-0 right-0 z-10 flex h-7 w-7 cursor-nwse-resize items-end justify-end p-1 text-slate-500 transition hover:text-cyan-300"
          title="拖动调整窗口大小（窗口位置不动）"
          style={{ touchAction: 'none' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M14 2v8M14 10L6 10M14 10l-4-4M14 14V6M14 6l-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
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
