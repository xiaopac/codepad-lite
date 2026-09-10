import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useUiStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';

// 交互终端渲染层（懒加载，含 xterm.js）：
// session 变化时建立 WebSocket 并挂载 xterm；visible 变化只做尺寸自适应（不断连）
export default function TerminalScreen({ session, containerRef, visible }) {
  const fitRef = useRef(null);

  // ── 会话生命周期 ──
  useEffect(() => {
    if (!session || !containerRef.current) return undefined;
    let disposed = false;
    const setStatus = useUiStore.getState().setTermStatus;
    const token = useAuthStore.getState().token;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(
      `${proto}//${window.location.host}/api/terminal/ws?token=${encodeURIComponent(token)}&session=${encodeURIComponent(session.id)}`,
    );

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
    const fit = new FitAddon();
    fitRef.current = fit;
    term.loadAddon(fit);
    term.open(containerRef.current);
    const doFit = () => {
      try { fit.fit(); } catch { /* 容器未就绪 */ }
    };
    doFit();
    window.addEventListener('resize', doFit);

    ws.onopen = () => {
      if (disposed) return;
      setStatus('running', '终端已连接，直接输入即可');
      try { term.focus(); } catch { /* 忽略 */ }
    };
    ws.onmessage = (ev) => {
      if (disposed) return;
      try {
        const m = JSON.parse(ev.data);
        if (m.type === 'ready') return;
        if (m.type === 'exit') {
          term.write(`\r\n\x1b[90m── 程序已退出（code=${m.code ?? '?'}）──\x1b[0m\r\n`);
          setStatus('closed', `程序已退出（code=${m.code ?? '?'}）`);
          return;
        }
        if (m.type === 'error') {
          term.write(`\r\n\x1b[31m${m.message}\x1b[0m\r\n`);
          setStatus('error', m.message || '启动失败');
          return;
        }
      } catch {
        term.write(ev.data);
      }
    };
    ws.onclose = () => {
      if (disposed) return;
      const s = useUiStore.getState().termStatus;
      if (s === 'running' || s === 'connecting') setStatus('closed', '连接已断开');
    };
    ws.onerror = () => {
      if (!disposed) setStatus('error', 'WebSocket 连接失败');
    };
    term.onData((d) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(d);
    });

    return () => {
      disposed = true;
      window.removeEventListener('resize', doFit);
      try { ws.close(); } catch { /* 忽略 */ }
      try { term.dispose(); } catch { /* 忽略 */ }
      fitRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  // ── 面板展开/收起：自适应尺寸（等高度动画完成） ──
  useEffect(() => {
    if (!visible) return undefined;
    const t = setTimeout(() => {
      try { fitRef.current?.fit(); } catch { /* 忽略 */ }
    }, 240);
    return () => clearTimeout(t);
  }, [visible]);

  return null;
}
