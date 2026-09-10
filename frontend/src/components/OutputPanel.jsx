import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUiStore } from '../store/uiStore';
import { useEditorStore } from '../store/editorStore';

// 终端式控制台：输出日志在上（自动滚底），输入框常驻在下——不再需要切换标签
export default function OutputPanel() {
  const outputOpen = useUiStore((s) => s.outputOpen);
  const outputHeight = useUiStore((s) => s.outputHeight);
  const setOutputHeight = useUiStore((s) => s.setOutputHeight);
  const toggleOutput = useUiStore((s) => s.toggleOutput);
  const stdin = useUiStore((s) => s.stdin);
  const setStdin = useUiStore((s) => s.setStdin);
  const result = useUiStore((s) => s.result);
  const resultAt = useUiStore((s) => s.resultAt);
  const runError = useUiStore((s) => s.runError);
  const running = useUiStore((s) => s.running);
  const runCode = useUiStore((s) => s.runCode);
  const clearConsole = useUiStore((s) => s.clearConsole);
  const code = useEditorStore((s) => s.code);

  const panelRef = useRef(null);
  const logRef = useRef(null);

  // 新输出自动滚动到底部
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [result, resultAt, runError, running]);

  // 拖动顶部分隔条调整输出面板高度（Pointer Events，兼容触摸）
  const startResize = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = outputHeight;
    const container = panelRef.current?.parentElement;

    const onMove = (ev) => {
      const containerH = container?.clientHeight ?? 600;
      const max = Math.max(200, containerH - 200);
      const next = Math.min(max, Math.max(180, startH + (startY - ev.clientY)));
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

  // 运行成功（退出码 0 且无编译错误）→ 绿光边框短暂闪烁
  const success =
    result && resultAt && !result.compile_error && Number(result.exit_code) === 0;

  // Ctrl/Cmd + Enter 在输入框里也能直接运行
  const handleInputKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      runCode();
    }
  };

  const stdinLines = stdin ? stdin.split('\n').filter((l) => l.trim() !== '').length : 0;

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
        title="拖动调整控制台高度"
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
            {/* 标题栏：控制台 + 状态 + 操作按钮 */}
            <div className="flex h-12 shrink-0 items-center gap-1 border-b border-white/10 px-2">
              <span className="neon-text pl-1 text-sm font-semibold tracking-wider">🖥 控制台</span>
              {result && (
                <span className="term-meta ml-2 hidden text-xs sm:inline">
                  ⏱ {Number(result.execution_time ?? 0).toFixed(2)}s · 退出码 {result.exit_code}
                </span>
              )}
              <span className="flex-1" />
              <button
                onClick={clearConsole}
                className="flex h-10 items-center gap-1 rounded-lg px-2.5 text-xs text-slate-400 transition hover:bg-white/10 hover:text-cyan-200"
                title="清空输出与输入"
              >
                🗑 <span className="hidden sm:inline">清空</span>
              </button>
              <button
                onClick={runCode}
                disabled={running}
                className="flex h-10 items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-cyan-400 px-3 text-xs font-semibold text-white shadow-neon-purple transition disabled:opacity-50"
              >
                {running ? '运行中…' : '▶ 运行'}
              </button>
              <button
                onClick={toggleOutput}
                className="ml-1 flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-cyan-200"
                aria-label="折叠控制台"
              >
                ⌄
              </button>
            </div>

            {/* 输出日志区（自动滚底） */}
            <div
              ref={logRef}
              className="min-h-0 flex-1 overflow-auto scroll-touch p-3 font-mono text-sm"
            >
              <OutputBody
                result={result}
                runError={runError}
                running={running}
                code={code}
                stdinLines={stdinLines}
              />
            </div>

            {/* 输入区：常驻下方，无需切换标签 */}
            <div className="shrink-0 border-t border-white/10 p-2">
              <div className="flex items-center justify-between px-1 pb-1">
                <span className="text-[10px] tracking-wider text-slate-500">
                  ⌨ 标准输入（运行时一次性发送{stdinLines > 0 ? `，共 ${stdinLines} 行` : ''}）
                </span>
                <span className="hidden text-[10px] text-slate-600 sm:inline">Ctrl/⌘ + Enter 运行</span>
              </div>
              <textarea
                className="h-[68px] w-full resize-none rounded-lg border border-white/10 bg-[#0a0a0f] p-2.5 font-mono text-[13px] leading-relaxed text-slate-100 outline-none transition focus:border-cyan-400/60 focus:shadow-neon-cyan"
                placeholder={'程序读取的输入，每行一个值\n例如：输入两个数 → 3 4'}
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                onKeyDown={handleInputKeyDown}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!outputOpen && (
        <button
          onClick={toggleOutput}
          className="flex h-[38px] w-full items-center justify-center gap-1 text-xs text-slate-400 transition hover:bg-white/5 hover:text-cyan-200"
        >
          控制台 ˄
        </button>
      )}
    </motion.section>
  );
}

function OutputBody({ result, runError, running, code, stdinLines }) {
  if (running) {
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
      <p className="font-sans text-sm leading-relaxed text-slate-500">
        点击右上角 ▶ 运行（或编辑器内 Ctrl/⌘ + Enter）。
        <br />
        程序需要的输入请写在下方输入框，运行时一次性发送。
      </p>
    );
  }

  const { stdout, stderr, compile_error, execution_time, exit_code } = result;
  const hasOutput = stdout || stderr || compile_error != null;

  // 交互式程序提示：输入耗尽（EOFError）或空转超时 + 代码里有读取输入
  const isTimeout = Number(exit_code) === 137 || /已被终止/.test(stderr || '');
  const eofError = /EOFError/.test(stderr || '');
  const readsInput = /input\s*\(|scanf|cin\s*>>|getline|fgets/.test(code || '');
  const showInteractiveHint = (isTimeout || eofError) && readsInput;

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

      {showInteractiveHint && (
        <div
          className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-3"
          style={{ boxShadow: '0 0 14px rgba(251,191,36,0.12)' }}
        >
          <p className="mb-1 font-sans text-sm font-bold text-amber-300">
            ⚠ 交互式循环出错{eofError && !isTimeout ? '（输入耗尽 EOFError）' : '（超时）'}
          </p>
          <p className="font-sans text-xs leading-relaxed text-amber-200/90">
            本站的输入是<b>运行前一次性发送</b>的，无法在程序运行中途输入。
            像 <code>while True + input()</code> 这样的程序，输入读完后就拿不到新输入
            （抛出 EOFError 或空转超时）。解决办法：
          </p>
          <ul className="mt-1.5 list-inside list-disc space-y-0.5 font-sans text-xs text-amber-200/80">
            <li>把要输入的内容<b>提前全部</b>写在下方输入框（每行一个）；</li>
            <li>给循环加<b>退出条件</b>（如输入特定值就 break）。</li>
          </ul>
        </div>
      )}

      <p className="term-meta border-t border-white/10 pt-2 font-sans text-xs">
        ⏱ 耗时 {Number(execution_time ?? 0).toFixed(2)}s · 退出码 {exit_code}
        {stdinLines > 0 ? ` · 已发送输入 ${stdinLines} 行` : ''}
      </p>
    </div>
  );
}
