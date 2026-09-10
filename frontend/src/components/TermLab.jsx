import { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';

// 隐藏页 /web（仅管理员，后端双保险）：交互式终端实验室
// 流程：POST /api/terminal/sessions 登记代码 → WebSocket 连接 → 沙箱内 PTY 真正启动
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

const INPUT_CLS =
  'glass h-11 w-full rounded-lg px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/60';

export default function TermLab({ onBack }) {
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(SAMPLE.python);
  const [status, setStatus] = useState('idle'); // idle | starting | running | closed | error
  const [statusText, setStatusText] = useState('');
  const [busy, setBusy] = useState(false);

  const termRef = useRef(null);
  const termElRef = useRef(null);
  const wsRef = useRef(null);
  const fitRef = useRef(null);

  const cleanup = useCallback(() => {
    try { wsRef.current?.close(); } catch { /* 忽略 */ }
    wsRef.current = null;
    try { termRef.current?.dispose(); } catch { /* 忽略 */ }
    termRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

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
        setStatusText('终端已连接——直接在下面打字交互（输入完按回车）');
        try { term.focus(); } catch { /* 忽略 */ }
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'ready') return;
          if (msg.type === 'exit') {
            term.write(`\r\n\x1b[90m── 程序已退出（code=${msg.code ?? '?'}）──\x1b[0m\r\n`);
            setStatus('closed');
            setStatusText(`程序已退出（code=${msg.code ?? '?'}）。点击「重新启动」可再次运行`);
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
          setStatusText('连接已断开。点击「重新启动」可再次运行');
        }
      };
      ws.onerror = () => {
        setStatus('error');
        setStatusText('WebSocket 连接失败，请检查后端与终端沙箱状态');
      };

      term.onData((d) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(d);
      });

      // 窗口变化自适应尺寸
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
    if (termElRef.current?._cleanupResize) {
      window.removeEventListener('resize', termElRef.current._cleanupResize);
    }
    cleanup();
    setStatus('closed');
    setStatusText('已停止。点击「启动终端」重新开始');
  };

  const statusMeta = {
    idle: { cls: 'text-slate-400', label: '待启动' },
    starting: { cls: 'text-cyan-300', label: '启动中…' },
    running: { cls: 'text-emerald-300', label: '运行中' },
    closed: { cls: 'text-amber-300', label: '已结束' },
    error: { cls: 'text-rose-300', label: '出错' },
  }[status];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="glass-strong flex h-14 shrink-0 items-center gap-2 border-x-0 border-t-0 px-3">
        <button
          onClick={onBack}
          className="flex h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-sm text-slate-400 transition hover:bg-white/10 hover:text-cyan-200"
        >
          <span className="text-lg leading-none">←</span> 返回
        </button>
        <span className="neon-text-purple text-base font-semibold tracking-wider">
          🧪 终端实验室 <span className="text-xs text-slate-500">（隐藏页 · 仅管理员）</span>
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto scroll-touch p-4">
        <div className="mx-auto max-w-4xl space-y-3">
          {/* 代码输入 */}
          <div className="glass rounded-2xl p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">语言</span>
              {[
                { id: 'python', label: '🐍 Python' },
                { id: 'cpp', label: '⚙️ C++' },
              ].map((l) => (
                <button
                  key={l.id}
                  onClick={() => switchLanguage(l.id)}
                  disabled={Boolean(termRef.current)}
                  className={`flex h-11 min-w-[96px] items-center justify-center rounded-lg px-3 text-sm transition disabled:opacity-40 ${
                    language === l.id
                      ? 'border border-cyan-400/60 bg-cyan-400/15 font-semibold text-cyan-200 shadow-neon-cyan'
                      : 'border border-white/10 bg-white/5 text-slate-400'
                  }`}
                >
                  {l.label}
                </button>
              ))}
              <span className="flex-1" />
              <span className={`text-xs ${statusMeta.cls}`}>
                ● {statusMeta.label}
                {statusText ? ` · ${statusText}` : ''}
              </span>
            </div>
            <textarea
              className={`${INPUT_CLS} mt-3 h-40 resize-none p-3 font-mono text-[13px] leading-relaxed ${
                termRef.current ? 'opacity-60' : ''
              }`}
              value={code}
              readOnly={Boolean(termRef.current)}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={start}
                disabled={busy || Boolean(termRef.current)}
                className="h-12 flex-1 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-400 text-base font-semibold text-white shadow-neon-purple transition disabled:opacity-50"
              >
                {busy ? '启动中…' : termRef.current ? '终端运行中' : '▶ 启动终端'}
              </button>
              <button
                onClick={stop}
                disabled={!termRef.current}
                className="h-12 shrink-0 rounded-xl border border-rose-400/40 bg-rose-500/10 px-5 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/25 disabled:opacity-40"
              >
                ⏹ 停止
              </button>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-600">
              ⚠️ 实验室模式：会话上限与时长受限（空闲 10 分钟回收、硬上限 30 分钟），
              沙箱无外网、非 root。运行后直接在下方黑色终端里输入内容并按回车。
            </p>
          </div>

          {/* 终端 */}
          <div className="overflow-hidden rounded-2xl border border-cyan-400/30 bg-[#0a0a12] shadow-[0_0_24px_rgba(0,240,255,0.12)]">
            <div className="flex h-9 items-center gap-1.5 border-b border-white/10 px-3">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
              <span className="ml-2 text-[10px] tracking-wider text-slate-500">
                {language === 'python' ? 'python3 -u main.py' : 'g++ main.cpp && ./main'}
              </span>
            </div>
            <div ref={termElRef} className="h-[380px] p-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
