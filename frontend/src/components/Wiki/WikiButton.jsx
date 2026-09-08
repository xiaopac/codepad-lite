import { useEffect, useMemo, useRef, useState } from 'react';
import { animate, motion, useMotionValue } from 'framer-motion';

// 左下角 Wiki 书签按钮：56pt 圆形毛玻璃 + 霓虹青蓝书本图标
// 可拖拽：位置记忆（localStorage），约束在可视区内；onTap 触发打开（拖拽不会误触）
const BTN_KEY = 'codepad-wiki-btn-pos';
const BTN = 56; // 按钮直径
const M = 8;    // 边缘留白

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function loadBtnPos() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const d = { x: 16, y: Math.max(M, vh - BTN - 16) };
  try {
    const p = JSON.parse(localStorage.getItem(BTN_KEY) || 'null');
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
      return {
        x: clamp(p.x, M, Math.max(M, vw - BTN - M)),
        y: clamp(p.y, M, Math.max(M, vh - BTN - M)),
      };
    }
  } catch { /* 损坏的存储忽略 */ }
  return d;
}

export default function WikiButton({ open, onTap }) {
  const btnRef = useRef(null);
  const saved = useMemo(loadBtnPos, []);
  const [vp, setVp] = useState(() => ({ vw: window.innerWidth, vh: window.innerHeight }));
  const x = useMotionValue(saved.x);
  const y = useMotionValue(saved.y + 48); // 从下方 48px 上浮入场
  const opacity = useMotionValue(0);

  // 入场：上浮 + 淡入到记忆位置
  useEffect(() => {
    const controls = animate(y, saved.y, { type: 'spring', stiffness: 320, damping: 28 });
    const fade = animate(opacity, 1, { duration: 0.5, delay: 0.4, ease: 'easeOut' });
    return () => {
      controls.stop();
      fade.stop();
    };
  }, [y, saved.y, opacity]);

  // 视口变化（旋转 iPad 等）：拉回可视区
  useEffect(() => {
    const onResize = () => {
      setVp({ vw: window.innerWidth, vh: window.innerHeight });
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      const nx = clamp(r.left, M, Math.max(M, window.innerWidth - BTN - M));
      const ny = clamp(r.top, M, Math.max(M, window.innerHeight - BTN - M));
      animate(x, nx, { duration: 0.2, ease: 'easeOut' });
      animate(y, ny, { duration: 0.2, ease: 'easeOut' });
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [x, y]);

  // 数值型拖拽约束：按钮始终完整落在可视区内
  const dragConstraints = useMemo(
    () => ({
      left: M,
      top: M,
      right: Math.max(M, vp.vw - BTN - M),
      bottom: Math.max(M, vp.vh - BTN - M),
    }),
    [vp.vw, vp.vh],
  );

  // 拖拽守卫：onDragStart 同步触发（早于鼠标释放后的 click 派发），
  // 用"拖拽开始时间戳"过滤拖拽结束时的误触 click（onDragEnd 是延迟回调，不可靠）
  const dragStartedAt = useRef(0);
  const handleDragStart = () => {
    dragStartedAt.current = Date.now();
  };
  const handleDragEnd = (e, info) => {
    // 钳制 + 吸附 + 记忆位置
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const nx = clamp(r.left, M, Math.max(M, window.innerWidth - BTN - M));
    const ny = clamp(r.top, M, Math.max(M, window.innerHeight - BTN - M));
    try {
      localStorage.setItem(BTN_KEY, JSON.stringify({ x: nx, y: ny }));
    } catch { /* 隐私模式等忽略 */ }
    animate(x, nx, { type: 'spring', stiffness: 420, damping: 32 });
    animate(y, ny, { type: 'spring', stiffness: 420, damping: 32 });
  };
  const handleClick = () => {
    if (Date.now() - dragStartedAt.current < 500) return; // 拖拽刚结束的 click 忽略
    onTap();
  };

  return (
    <motion.button
      ref={btnRef}
      drag
      dragConstraints={dragConstraints}
      dragMomentum={false}
      dragElastic={0.05}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      whileHover={{ scale: 1.06, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.94, transition: { duration: 0.12 } }}
      style={{ x, y, opacity, touchAction: 'none' }}
      aria-label="打开编程 Wiki"
      title="编程 Wiki（可拖动位置）"
      className="fixed left-0 top-0 z-[70] flex h-14 w-14 items-center justify-center rounded-full border border-cyan-400/50 bg-[#0a0a12]/70 shadow-[0_0_18px_rgba(0,240,255,0.35)] backdrop-blur-xl transition-shadow hover:shadow-[0_0_28px_rgba(0,240,255,0.55)]"
    >
      {/* 书本 SVG（霓虹青蓝 + 渐变书脊） */}
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        draggable={false}
        className={open ? 'text-cyan-300' : 'text-cyan-200'}
        style={{ pointerEvents: 'none', WebkitUserDrag: 'none', userSelect: 'none' }}
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
          className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border border-cyan-300/60 bg-cyan-400"
          style={{ boxShadow: '0 0 8px rgba(0,240,255,0.9)', pointerEvents: 'none' }}
        />
      )}
    </motion.button>
  );
}
