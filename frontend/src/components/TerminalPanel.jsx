import { lazy, Suspense, useRef } from 'react';
import { motion } from 'framer-motion';
import { useUiStore } from '../store/uiStore';

// 工作区交互终端面板：可收起（收起不中断会话）、高度可拖、状态栏 + 停止/隐藏
const TerminalScreen = lazy(() => import('./TerminalScreen'));

const STATUS_META = {
  idle: { label: '待启动', cls: 'text-slate-400' },
  starting: { label: '启动中…', cls: 'text-cyan-300' },
  connecting: { label: '连接中…', cls: 'text-cyan-300' },
  running: { label: '运行中', cls: 'text-emerald-300' },
  closed: { label: '已结束', cls: 'text-amber-300' },
  error: { label: '出错', cls: 'text-rose-300' },
};

export default function TerminalPanel() {
  const termOpen = useUiStore((s) => s.termOpen);
  const setTermOpen = useUiStore((s) => s.setTermOpen);
  const termHeight = useUiStore((s) => s.termHeight);
  const setTermHeight = useUiStore((s) => s.setTermHeight);
  const termSession = useUiStore((s) => s.termSession);
  const termStatus = useUiStore((s) => s.termStatus);
  const termStatusText = useUiStore((s) => s.termStatusText);
  const stopTerminal = useUiStore((s) => s.stopTerminal);

  const panelRef = useRef(null);
  const screenRef = useRef(null);
  const meta = STATUS_META[termStatus] || STATUS_META.idle;

  // 拖动顶部分隔条调整终端高度
  const startResize = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = termHeight;
    const container = panelRef.current?.parentElement;
    const onMove = (ev) => {
      const containerH = container?.clientHeight ?? 600;
      const max = Math.max(200, containerH - 240);
      const next = Math.min(max, Math.max(180, startH + (startY - ev.clientY)));
      setTermHeight(Math.round(next));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  return (
    <motion.section
      ref={panelRef}
      animate={{ height: termOpen ? termHeight : 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`relative shrink-0 overflow-hidden ${termOpen ? 'glass-strong' : ''}`}
    >
      <div className="flex h-full flex-col">
        <div
          onPointerDown={startResize}
          className="flex h-1.5 w-full shrink-0 cursor-row-resize touch-none items-center justify-center bg-white/5"
          title="拖动调整终端高度"
          aria-hidden="true"
        >
          <div className="h-0.5 w-10 rounded-full bg-cyan-400/40" />
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          {/* 终端标题栏 */}
          <div className="flex h-10 shrink-0 items-center gap-2 border-b border-white/10 px-3">
            <span className="neon-text text-xs font-semibold tracking-wider">💻 终端</span>
            <span className="truncate text-[10px] text-slate-600">
              {termSession?.file || '未启动'}
              {termSession?.language === 'python' && ' · python3'}
              {termSession?.language === 'cpp' && ' · g++'}
              {termSession?.language === 'c' && ' · gcc'}
            </span>
            <span className={`flex-1 truncate text-right text-[10px] ${meta.cls}`}>
              ● {meta.label}
              {termStatusText ? <span className="text-slate-500"> · {termStatusText}</span> : null}
            </span>
            <button
              onClick={stopTerminal}
              className="flex h-9 shrink-0 items-center gap-1 rounded-lg border border-rose-400/40 bg-rose-500/10 px-2.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/25"
            >
              ⏹ 停止
            </button>
            <button
              onClick={() => setTermOpen(false)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-cyan-200"
              aria-label="隐藏终端"
              title="隐藏终端（会话继续运行）"
            >
              ⌄
            </button>
          </div>

          {/* xterm（懒加载） */}
          <div ref={screenRef} className="min-h-0 flex-1 overflow-hidden bg-[#0a0a12] p-2">
            {termSession && (
              <Suspense fallback={<p className="p-2 text-xs text-slate-500">正在加载终端组件…</p>}>
                <TerminalScreen session={termSession} containerRef={screenRef} visible={termOpen} />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
