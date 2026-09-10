import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';

// 隐藏页 /web（仅管理员，后端双保险）：交互式终端实验室
// 布局与工作区一致：工具栏 + 代码区 + 底部可隐藏终端（点「启动」时自动弹出）
const SAMPLE = {
  python: `# 交互式终端测试：运行后可以直接在终端里输入
while True:
    a = input("please choose a number: ")
    if a == "0":
        print("bye~")
        break
    print("你输入了:", a)
`,
  cpp: `// 交互式终端测试：编译后运行，可在终端里输入
#include <iostream>
#include <string>
using namespace std;
int main() {
    string s;
    while (true) {
        cout << "please choose a number: ";
        if (!(cin >> s)) break;
        if (s == "0") { cout << "bye~" << endl; break; }
        cout << "你输入了: " << s << endl;
    }
    return 0;
}
`,
};

const STATUS_META = {
  idle: { label: '待启动', cls: 'text-slate-400' },
  starting: { label: '启动中…', cls: 'text-cyan-300' },
  running: { label: '运行中', cls: 'text-emerald-300' },
  closed: { label: '已结束', cls: 'text-amber-300' },
  error: { label: '出错', cls: 'text-rose-300' },
};

export default function TermLab({ onBack }) {
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(SAMPLE.python);
  const [status, setStatus] = useState('idle');
  const [statusText, setStatusText] = useState('');
  const [busy, setBusy] = useState(false);
  // 终端面板：默认隐藏；点「启动终端」时自动弹出；可手动折叠（折叠不中断会话）
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(320);

  const termRef = useRef(null);
  const termElRef = useRef(null);
  const panelRef = useRef(null);
  const wsRef = useRef(null);
  const fitRef = useRef(null);

  const cleanup = useCallback(() => {
    try { wsRef.current?.close(); } catch { /* 忽略 */ }
    wsRef.current = null;
    try { termRef.current?.dispose(); } catch { /* 忽略 */ }
    termRef.current = null;
    fitRef.current = null;
    if (termElRef.current?._cleanupResize) {
      window.removeEventListener('resize', termElRef.current._cleanupResize);
      termElRef.current._cleanupResize = null;
    }
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  // 终端面板展开后自适应尺寸
  useEffect(() => {
    if (!terminalOpen || !termRef.current) return;
    const t = setTimeout(() => {
      try { fitRef.current?.fit(); } catch { /* 容器未就绪 */ }
    }, 80);
    return () => clearTimeout(t);
  }, [terminalOpen, terminalHeight]);

  const switchLanguage = (lang) => {
    if (termRef.current) return; // 运行中不允许切换
    setLanguage(lang);
    setCode(SAMPLE[lang]);
  };

  const start = async () => {
    if (busy || termRef.current) return;
    setBusy(true);
    setStatus('starting');
    setStatusText('正在创建终端会话…');
    setTerminalOpen(true); // 启动时自动弹出终端
    try {
      const data = await api('/api/terminal/sessions', {
        method: 'POST',
        body: { language, code },
      });
      const sessionId = data.session_id;
      const token = useAuthStore.getState().token;
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${window.location.host}/api/terminal/ws?token=${encodeURIComponent(token)}&session=${encodeURIComponent(sessionId)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Cascadia Code', Menlo, Consolas, monospace",
        theme: {
          background: '#0a0a12',
          foreground: '#d1fae5',
          cursor: '#00f0ff',
          selectionBackground: 'rgba(0,240,255,0.25)',
        },
        scrollback: 2000,
      });
      termRef.current = term;
      const fit = new FitAddon();
      fitRef.current = fit;
      term.loadAddon(fit);
      term.open(termElRef.current);
      try { fit.fit(); } catch { /* 容器未就绪 */ }

      ws.onopen = () => {
        setStatus('running');
        setStatusText('直接在终端里输入，回车发送');
        try { term.focus(); } catch { /* 忽略 */ }
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'ready') return;
          if (msg.type === 'exit') {
            term.write(`\r\n\x1b[90m── 程序已退出（code=${msg.code ?? '?'}）──\x1b[0m\r\n`);
            setStatus('closed');
            setStatusText(`程序已退出（code=${msg.code ?? '?'}），可修改代码后重新启动`);
            return;
          }
          if (msg.type === 'error') {
            term.write(`\r\n\x1b[31m${msg.message}\x1b[0m\r\n`);
            setStatus('error');
            setStatusText(msg.message || '启动失败');
            return;
          }
        } catch {
          term.write(ev.data);
        }
      };
      ws.onclose = () => {
        if (status !== 'closed' && status !== 'error') {
          setStatus('closed');
          setStatusText('连接已断开，可重新启动');
        }
      };
      ws.onerror = () => {
        setStatus('error');
        setStatusText('WebSocket 连接失败，请检查后端与终端沙箱状态');
      };

      term.onData((d) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(d);
      });

      const onResize = () => {
        try { fit.fit(); } catch { /* 忽略 */ }
      };
      window.addEventListener('resize', onResize);
      termElRef.current._cleanupResize = onResize;
    } catch (err) {
      setStatus('error');
      setStatusText(err.message || '启动失败');
    } finally {
      setBusy(false);
    }
  };

  const stop = () => {
    cleanup();
    setStatus('closed');
    setStatusText('已停止，可修改代码后重新启动');
  };

  // 终端面板高度拖拽（与工作台输出面板一致的交互）
  const startPanelResize = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = terminalHeight;
    const container = panelRef.current?.parentElement;
    const onMove = (ev) => {
      const containerH = container?.clientHeight ?? 600;
      const max = Math.max(200, containerH - 220);
      const next = Math.min(max, Math.max(180, startH + (startY - ev.clientY)));
      setTerminalHeight(Math.round(next));
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

  const meta = STATUS_META[status] || STATUS_META.idle;
  const sessionRunning = Boolean(termRef.current);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* ── 工具栏（与工作区一致的风格） ── */}
      <header className="glass-strong flex h-14 shrink-0 items-center gap-1 border-x-0 border-t-0 px-2 sm:gap-2 sm:px-3">
        <button
          onClick={onBack}
          className="flex h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-sm text-slate-400 transition hover:bg-white/10 hover:text-cyan-200"
        >
          <span className="text-lg leading-none">←</span>
          <span className="hidden sm:inline">返回</span>
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
          <span className="neon-text shrink-0 text-base font-bold tracking-wider">⚡</span>
          <span className="neon-text-purple truncate text-sm font-semibold">🧪 终端实验室</span>
          <span className="hidden text-[10px] text-slate-600 sm:inline">隐藏页 · 仅管理员</span>
        </div>

        {/* 状态 */}
        <span className={`hidden shrink-0 items-center gap-1 text-xs md:flex ${meta.cls}`}>
          ● {meta.label}
          {statusText ? <span className="max-w-[180px] truncate text-slate-500">· {statusText}</span> : null}
        </span>

        {/* 语言切换 */}
        <div className="glass flex shrink-0 items-center rounded-xl p-0.5">
          {[
            { id: 'python', label: 'Py' },
            { id: 'cpp', label: 'C++' },
          ].map((l) => (
            <button
              key={l.id}
              onClick={() => switchLanguage(l.id)}
              disabled={sessionRunning}
              className={`flex h-10 min-w-[40px] items-center justify-center rounded-lg px-2 text-xs font-semibold transition disabled:opacity-40 ${
                language === l.id
                  ? 'bg-cyan-400/20 text-cyan-200 shadow-neon-cyan'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title={l.id === 'python' ? 'Python' : 'C++'}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* 启动 / 停止 */}
        {sessionRunning ? (
          <button
            onClick={stop}
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/25"
          >
            ⏹ <span className="hidden sm:inline">停止</span>
          </button>
        ) : (
          <button
            onClick={start}
            disabled={busy}
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-400 px-3 text-sm font-semibold text-white shadow-neon-purple transition disabled:opacity-50"
          >
            {busy ? '…' : '▶'} <span className="hidden sm:inline">{busy ? '启动中' : '启动终端'}</span>
          </button>
        )}
      </header>

      {/* ── 主体：代码区 + 底部终端 ── */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* 代码区（类编辑器） */}
        <main className="min-h-0 flex-1 bg-cyber-panel p-3">
          <div className={`glass flex h-full flex-col rounded-2xl p-4 ${sessionRunning ? 'opacity-80' : ''}`}>
            <div className="flex shrink-0 items-center justify-between pb-2">
              <span className="text-xs tracking-wider text-slate-500">
                {language === 'python' ? 'main.py' : 'main.cpp'}
                {sessionRunning ? ' · 运行中（只读）' : ''}
              </span>
              <span className="hidden text-[10px] text-slate-600 sm:inline">Ctrl/⌘ + Enter 启动</span>
            </div>
            <textarea
              className="min-h-0 w-full flex-1 resize-none rounded-xl border border-white/10 bg-[#0a0a0f] p-3 font-mono text-sm leading-relaxed text-slate-100 outline-none transition focus:border-cyan-400/60 focus:shadow-neon-cyan"
              value={code}
              readOnly={sessionRunning}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  start();
                }
              }}
              spellCheck={false}
            />
            <p className="shrink-0 pt-2 text-[10px] leading-relaxed text-slate-600">
              ⚠️ 实验室模式：会话上限与时长受限（空闲 10 分钟回收、硬上限 30 分钟），沙箱无外网、非 root。
              运行后直接在底部终端里输入内容并按回车——无需预输入。
            </p>
          </div>
        </main>

        {/* 底部终端面板：可隐藏、可拖高度、启动时自动弹出
            收起时保持内容挂载（xterm 实例绑定关系不中断，再展开输出仍在） */}
        <motion.section
          ref={panelRef}
          animate={{ height: terminalOpen ? terminalHeight : 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className={`relative shrink-0 overflow-hidden ${terminalOpen ? 'glass-strong' : ''}`}
        >
          <div className="flex h-full flex-col">
              <div
                onPointerDown={startPanelResize}
                className="flex h-1.5 w-full shrink-0 cursor-row-resize touch-none items-center justify-center bg-white/5"
                title="拖动调整终端高度"
                aria-hidden="true"
              >
                <div className="h-0.5 w-10 rounded-full bg-cyan-400/40" />
              </div>

              <div className="flex min-h-0 flex-1 flex-col">
                {/* 终端标题栏 */}
                <div className="flex h-10 shrink-0 items-center gap-2 border-b border-white/10 px-3">
                  <span className="neon-text text-xs font-semibold tracking-wider">🖥 终端</span>
                  <span className="text-[10px] text-slate-600">
                    {language === 'python' ? 'python3 -u main.py' : 'g++ main.cpp && ./main'}
                  </span>
                  <span className={`flex-1 truncate text-right text-[10px] ${meta.cls}`}>
                    ● {meta.label}
                  </span>
                  <button
                    onClick={() => setTerminalOpen(false)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-cyan-200"
                    aria-label="隐藏终端"
                    title="隐藏终端（会话继续运行）"
                  >
                    ⌄
                  </button>
                </div>

                {/* xterm */}
                <div ref={termElRef} className="min-h-0 flex-1 overflow-hidden bg-[#0a0a12] p-2" />
              </div>
            </div>
        </motion.section>
      </div>

      {/* ── 右下角悬浮按钮：打开/收起终端（面板打开时自动浮到面板上方） ── */}
      <motion.button
        animate={{ bottom: terminalOpen ? terminalHeight + 20 : 16 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        onClick={() => setTerminalOpen((v) => !v)}
        className={`absolute right-4 z-20 flex h-12 items-center gap-2 rounded-full border px-4 text-sm font-semibold shadow-[0_0_18px_rgba(0,240,255,0.35)] backdrop-blur-xl transition-shadow hover:shadow-[0_0_28px_rgba(0,240,255,0.55)] ${
          terminalOpen
            ? 'border-cyan-400/50 bg-cyan-400/15 text-cyan-200'
            : 'border-cyan-400/50 bg-[#0a0a12]/80 text-cyan-200'
        }`}
        title={terminalOpen ? '收起终端（会话继续运行）' : '打开终端'}
        aria-label={terminalOpen ? '收起终端' : '打开终端'}
      >
        <span>🖥</span>
        <span>{terminalOpen ? '收起终端' : '打开终端'}</span>
        {!terminalOpen && sessionRunning && (
          <span
            className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border border-emerald-300/60 bg-emerald-400"
            style={{ boxShadow: '0 0 8px rgba(52,211,153,0.9)' }}
          />
        )}
      </motion.button>
    </div>
  );
}
