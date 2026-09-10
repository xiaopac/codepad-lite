// 交互式终端 WebSocket 代理（仅管理员）
// 浏览器 WS → 后端 /api/terminal/ws?token=...&session=... → term-runner /ws?session=...
// 鉴权：浏览器 WebSocket 无法携带 Authorization 头，token 走 query（HTTPS 下安全）；
// term-runner 只在 internal 网络，外部无法直达。
const jwt = require('jsonwebtoken');
const { WebSocketServer, WebSocket } = require('ws');
const config = require('./config');
const db = require('./db');
const { isAdminUser } = require('./middleware/auth');
const { logger } = require('./utils/logger');

function attachTerminalWs(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    let pathname = '';
    let searchParams = new URLSearchParams();
    try {
      const url = new URL(req.url, 'http://x');
      pathname = url.pathname;
      searchParams = url.searchParams;
    } catch { /* 非法 URL */ }

    if (pathname !== '/api/terminal/ws') return; // 非终端连接，不处理

    // 1. JWT 鉴权（query token）
    const token = searchParams.get('token') || '';
    let payload;
    try {
      payload = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] });
    } catch {
      socket.destroy();
      return;
    }
    // 2. 管理员闸门（每次握手都查库，权限变更即时生效）
    const user = db
      .prepare('SELECT id, email, role, status FROM users WHERE id = ?')
      .get(payload.id);
    if (!isAdminUser(user) || user.status !== 'active') {
      socket.destroy();
      return;
    }
    // 3. 会话 ID 白名单格式
    const sessionId = searchParams.get('session') || '';
    if (!/^[a-f0-9]{16,40}$/.test(sessionId)) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.sessionId = sessionId;
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws) => {
    const sessionId = ws.sessionId;
    // 连接 term-runner（同容器网络，http 配置转 ws）
    const upstreamUrl = `${config.TERM_RUNNER_URL.replace(/^http/, 'ws')}/ws?session=${encodeURIComponent(sessionId)}`;
    let up;
    try {
      up = new WebSocket(upstreamUrl);
    } catch {
      ws.close(1011, '终端服务不可用');
      return;
    }
    let closed = false;
    const kill = () => {
      if (closed) return;
      closed = true;
      try { ws.close(); } catch { /* 忽略 */ }
      try { up.close(); } catch { /* 忽略 */ }
    };

    up.on('open', () => {
      // 浏览器 → term-runner（按键输入）
      ws.on('message', (raw) => {
        if (up.readyState === WebSocket.OPEN) {
          try { up.send(raw.toString()); } catch { /* 忽略 */ }
        }
      });
    });
    up.on('message', (raw) => {
      // term-runner → 浏览器（终端输出）
      if (ws.readyState === WebSocket.OPEN) {
        try { ws.send(raw.toString()); } catch { /* 忽略 */ }
      }
    });
    up.on('error', (err) => {
      logger.warn(`[term] 上游连接错误（${sessionId}）：${err.message}`);
      kill();
    });
    up.on('close', () => kill());
    ws.on('error', () => kill());
    ws.on('close', () => kill());
    // 上游迟迟不连接 → 超时断开
    const connectTimer = setTimeout(() => {
      if (up.readyState !== WebSocket.OPEN) kill();
    }, 10000);
    connectTimer.unref();
  });
}

module.exports = { attachTerminalWs };
