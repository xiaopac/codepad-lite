import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, animate, motion, useDragControls, useMotionValue } from 'framer-motion';
import RFB from '@novnc/novnc';
import { useUiStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';

// pygame 程序窗口浮层（Phase 1）：
// 可拖拽（仅标题栏，画布区保留给 pygame 鼠标交互）+ 右下角缩放（位置不动）
// + 等比画面（letterbox，绝不拉伸背景）
// 画面 = 会话虚拟屏幕的 noVNC 流（经后端 /api/terminal/vncws 代理）
const MIN_W = 340;
const MIN_H = 260;
const SAFE = 8;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function defaultState() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = clamp(Math.round(vw * 0.62), MIN_W, vw - SAFE * 2);
  const h = clamp(Math.round(w * 0.78), MIN_H, vh - SAFE * 2);
  return { x: Math.max(SAFE, vw - w - SAFE - 8), y: Math.max(SAFE, Math.round(vh * 0.1)), w, h };
}

function TermWindowInner() {
  const termSession = useUiStore((s) => s.termSession);
  const setTermWinOpen = useUiStore((s) => s.setTermWinOpen);

  const winRef = useRef(null);
  const canvasWrapRef = useRef(null);
  const rfbRef = useRef(null);
  const dragControls = useDragControls();
  const [connState, setConnState] = useState('connecting'); // connecting | connected | disconnected

  const saved = useMemo(defaultState, []);
  const x = useMotionValue(saved.x);
  const y = useMotionValue(saved.y);
  const [size, setSize] = useState({ w: saved.w, h: saved.h });
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const [vp, setVp] = useState(() => ({ vw: window.innerWidth, vh: window.innerHeight }));

  const dragConstraints = useMemo(
    () => ({
      left: SAFE,
      top: SAFE,
      right: Math.max(SAFE, vp.vw - size.w - SAFE),
      bottom: Math.max(SAFE, vp.vh - size.h - SAFE),
    }),
    [vp.vw, vp.vh, size.w, size.h],
  );

  // ── noVNC 连接（会话固定后建立；窗口关闭即断开） ──
  useEffect(() => {
    const wrap = canvasWrapRef.current;
    if (!wrap || !termSession) return undefined;
    setConnState('connecting');

    const token = useAuthStore.getState().token;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/api/terminal/vncws?token=${encodeURIComponent(token)}&session=${encodeURIComponent(termSession.id)}`;

    const rfb = new RFB(wrap, url, { credentials: { password: '' } });
    rfb.scaleViewport = true; // 等比缩放填满容器（不拉伸）
    rfb.resizeSession = false;
    rfb.addEventListener('connect', () => setConnState('connected'));
    rfb.addEventListener('disconnect', () => setConnState('disconnected'));
    rfbRef.current = rfb;

    return () => {
      try { rfb.disconnect(); } catch { /* 忽略 */ }
      rfbRef.current = null;
    };
  }, [termSession?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Esc 关闭
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setTermWinOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setTermWinOpen]);

  // 视口变化：拉回可视区
  useEffect(() => {
    const onResize = () => {
      setVp({ vw: window.innerWidth, vh: window.innerHeight });
      const r = winRef.current?.getBoundingClientRect();
      if (!r) return;
      const nx = clamp(r.left, SAFE, Math.max(SAFE, window.innerWidth - r.width - SAFE));
      const ny = clamp(r.top, SAFE, Math.max(SAFE, window.innerHeight - r.height - SAFE));
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

  // 手动派发窗口拖拽：仅标题栏/空白处可拖；画布（pygame 鼠标交互）与按钮、缩放把手不拖
  const startPanelDrag = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest('button, canvas, a, input, [data-nodrag]')) return;
    dragControls.start(e);
  };

  // 拖拽结束：吸附
  const handleDragEnd = () => {
    const r = winRef.current?.getBoundingClientRect();
    if (!r) return;
    const nx = clamp(r.left, SAFE, Math.max(SAFE, window.innerWidth - r.width - SAFE));
    const ny = clamp(r.top, SAFE, Math.max(SAFE, window.innerHeight - r.height - SAFE));
    animate(x, nx, { type: 'spring', stiffness: 420, damping: 32 });
    animate(y, ny, { type: 'spring', stiffness: 420, damping: 32 });
  };

  // 右下角缩放：位置不动，尺寸受限屏幕
  const startResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = sizeRef.current.w;
    const startH = sizeRef.current.h;
    const move = (ev) => {
      setSize({
        w: clamp(startW + ev.clientX - startX, MIN_W, window.innerWidth - SAFE * 2),
        h: clamp(startH + ev.clientY - startY, MIN_H, window.innerHeight - SAFE * 2),
      });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const connMeta = {
    connecting: { label: '连接画面中…', cls: 'text-cyan-300' },
    connected: { label: '已连接', cls: 'text-emerald-300' },
    disconnected: { label: '画面断开', cls: 'text-amber-300' },
  }[connState];

  return (
    <motion.div
      ref={winRef}
      drag
      dragControls={dragControls}
      dragListener={false}
      onPointerDown={startPanelDrag}
      dragConstraints={dragConstraints}
      dragMomentum={false}
      dragElastic={0.05}
      onDragEnd={handleDragEnd}
      style={{ x, y, width: size.w, height: size.h }}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="absolute left-0 top-0 flex select-none flex-col overflow-hidden rounded-2xl border border-cyan-400/40 bg-[rgba(10,10,15,0.95)] shadow-[0_0_44px_rgba(0,240,255,0.18)] backdrop-blur-xl"
    >
      {/* 标题栏（拖动区） */}
      <div className="flex h-11 shrink-0 cursor-grab items-center gap-2 border-b border-white/10 px-3 active:cursor-grabbing">
        <span className="text-base">🪟</span>
        <span className="neon-text min-w-0 flex-1 truncate text-sm font-semibold tracking-wide">
          程序窗口
          <span className="ml-2 text-[10px] font-normal text-slate-500">{termSession?.file}</span>
        </span>
        <span className={`shrink-0 text-[10px] ${connMeta.cls}`}>● {connMeta.label}</span>
        <button
          onClick={() => setTermWinOpen(false)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
          aria-label="关闭程序窗口"
          title="关闭程序窗口（程序仍在终端中运行）"
        >
          ✕
        </button>
      </div>

      {/* 画面区：等比缩放 + 留黑边（背景不压缩）；noVNC 画布接收 pygame 鼠标/键盘事件 */}
      <div className="flex min-h-0 flex-1 items-center justify-center bg-[#050508] p-2">
        <div ref={canvasWrapRef} className="flex h-full w-full items-center justify-center overflow-hidden" />
      </div>

      {/* 右下角缩放把手 */}
      <div
        data-nodrag
        onPointerDown={startResize}
        className="absolute bottom-0 right-0 z-10 flex h-7 w-7 cursor-nwse-resize items-end justify-end p-1 text-slate-500 transition hover:text-cyan-300"
        title="拖动调整窗口大小"
        style={{ touchAction: 'none' }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M14 2v8M14 10L6 10M14 10l-4-4M14 14V6M14 6l-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </div>
    </motion.div>
  );
}

// pygame 程序窗口浮层：portal 到 body，全局层级（z-94，低于 Wiki 95/Toast 100）
export default function TermWindow() {
  const termWinOpen = useUiStore((s) => s.termWinOpen);
  const termSession = useUiStore((s) => s.termSession);
  const setTermWinOpen = useUiStore((s) => s.setTermWinOpen);
  const close = useCallback(() => setTermWinOpen(false), [setTermWinOpen]);

  return createPortal(
    <AnimatePresence>
      {termWinOpen && termSession && (
        <div key="term-win" className="fixed inset-0 z-[94]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={close}
          />
          <TermWindowInner />
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
