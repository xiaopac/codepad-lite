import { useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUiStore } from '../store/uiStore';

const TAB_BASE = 'relative flex h-11 items-center rounded-lg px-3 text-sm font-medium transition';

export default function OutputPanel() {
  const outputOpen = useUiStore((s) => s.outputOpen);
  const outputTab = useUiStore((s) => s.outputTab);
  const setOutputTab = useUiStore((s) => s.setOutputTab);
  const outputHeight = useUiStore((s) => s.outputHeight);
  const setOutputHeight = useUiStore((s) => s.setOutputHeight);
  const toggleOutput = useUiStore((s) => s.toggleOutput);
  const stdin = useUiStore((s) => s.stdin);
  const setStdin = useUiStore((s) => s.setStdin);
  const result = useUiStore((s) => s.result);
  const resultAt = useUiStore((s) => s.resultAt);
  const runError = useUiStore((s) => s.runError);
  const running = useUiStore((s) => s.running);

  const panelRef = useRef(null);

  // 拖动顶部分隔条调整输出面板高度（Pointer Events，兼容触摸）
  const startResize = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = outputHeight;
    const container = panelRef.current?.parentElement;

    const onMove = (ev) => {
      const containerH = container?.clientHeight ?? 600;
      const max = Math.max(140, containerH - 160);
      const next = Math.min(max, Math.max(120, startH + (startY - ev.clientY)));
      setOutputHeight(Math.round(next));
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

  const tabCls = (active) =>
    `${TAB_BASE} ${active ? 'text-cyan-200' : 'text-slate-500 hover:text-slate-300'}`;

  // 运行成功（退出码 0 且无编译错误）→ 绿光边框短暂闪烁
  const success =
    result && resultAt && !result.compile_error && Number(result.exit_code) === 0;

  return (
    <motion.section
      ref={panelRef}
      animate={{ height: outputOpen ? outputHeight : 44 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      className="glass-strong relative shrink-0 overflow-hidden border-x-0 border-b-0"
    >
      {/* 编译/运行成功：绿光边框闪烁 */}
      {success && (
        <div
          key={resultAt}
          className="success-flash pointer-events-none absolute inset-0 z-10 rounded-t-lg border-2 border-emerald-400/80"
          style={{ boxShadow: '0 0 24px rgba(52,211,153,0.45)' }}
        />
      )}

      <div
        onPointerDown={startResize}
        className="flex h-1.5 w-full cursor-row-resize touch-none items-center justify-center bg-white/5"
        title="拖动调整输出面板高度"
        aria-hidden="true"
      >
        <div className="h-0.5 w-10 rounded-full bg-cyan-400/40" />
      </div>

      <AnimatePresence initial={false}>
        {outputOpen && (
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="flex h-[calc(100%-6px)] flex-col"
          >
            <div className="flex h-12 shrink-0 items-center gap-1 border-b border-white/10 px-2">
              <button className={tabCls(outputTab === 'output')} onClick={() => setOutputTab('output')}>
                输出
                {outputTab === 'output' && (
                  <motion.span
                    layoutId="output-tab-underline"
                    className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-cyan-400"
                    style={{ boxShadow: '0 0 8px rgba(0,240,255,0.8)' }}
                  />
                )}
              </button>
              <button className={tabCls(outputTab === 'stdin')} onClick={() => setOutputTab('stdin')}>
                输入数据
                {outputTab === 'stdin' && (
                  <motion.span
                    layoutId="output-tab-underline"
                    className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-cyan-400"
                    style={{ boxShadow: '0 0 8px rgba(0,240,255,0.8)' }}
                  />
                )}
              </button>
              {result && (
                <span className="term-meta ml-auto hidden text-xs sm:inline">
                  ⏱ {Number(result.execution_time ?? 0).toFixed(2)}s · 退出码 {result.exit_code}
                </span>
              )}
              <button
                onClick={toggleOutput}
                className="ml-auto flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-cyan-200 sm:ml-2"
                aria-label="折叠输出面板"
              >
                ⌄
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto scroll-touch p-3 font-mono text-sm">
              {outputTab === 'stdin' ? (
                <textarea
                  className="h-full min-h-[96px] w-full resize-none rounded-lg border border-white/10 bg-[#0a0a0f] p-3 text-slate-100 outline-none transition focus:border-cyan-400/60 focus:shadow-neon-cyan"
                  placeholder={'在此输入程序的标准输入（stdin）…\n例如读取数字的程序，每行输入一个值'}
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                />
              ) : (
                <OutputBody result={result} runError={runError} running={running} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!outputOpen && (
        <button
          onClick={toggleOutput}
          className="flex h-[38px] w-full items-center justify-center gap-1 text-xs text-slate-400 transition hover:bg-white/5 hover:text-cyan-200"
        >
          输出面板 ˄
        </button>
      )}
    </motion.section>
  );
}

function OutputBody({ result, runError, running }) {
  if (running) {
    // 波浪形加载指示器
    return (
      <div className="flex items-center gap-3 text-slate-400">
        <span className="wave-loader">
          <i />
          <i />
          <i />
          <i />
        </span>
        <span>正在执行…</span>
      </div>
    );
  }
  if (runError) {
    return <p className="term-err whitespace-pre-wrap break-words">⚠ {runError}</p>;
  }
  if (!result) {
    return (
      <p className="text-slate-500">
        点击上方 ▶ 运行 按钮查看输出。运行前可在「输入数据」标签中填写 stdin。
      </p>
    );
  }

  const { stdout, stderr, compile_error, execution_time, exit_code } = result;
  const hasOutput = stdout || stderr || compile_error != null;

  return (
    <div className="space-y-3">
      {compile_error != null && (
        <div
          className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3"
          style={{ boxShadow: '0 0 14px rgba(244,63,94,0.15)' }}
        >
          <p className="mb-1 font-sans text-sm font-bold text-rose-400">✗ 编译错误</p>
          <pre className="term-err whitespace-pre-wrap break-words">{compile_error}</pre>
        </div>
      )}

      {stdout ? (
        <div>
          <p className="mb-1 font-sans text-xs font-semibold text-slate-500">标准输出 stdout</p>
          <pre className="term-out whitespace-pre-wrap break-words">{stdout}</pre>
        </div>
      ) : null}

      {stderr ? (
        <div>
          <p className="mb-1 font-sans text-xs font-semibold text-rose-500/80">标准错误 stderr</p>
          <pre className="term-err whitespace-pre-wrap break-words">{stderr}</pre>
        </div>
      ) : null}

      {!hasOutput && <p className="text-slate-500">（无输出）</p>}

      <p className="term-meta border-t border-white/10 pt-2 font-sans text-xs">
        ⏱ 耗时 {Number(execution_time ?? 0).toFixed(2)}s · 退出码 {exit_code}
      </p>
    </div>
  );
}
