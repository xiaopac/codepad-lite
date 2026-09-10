// CodePad Lite term-runner：交互式终端沙箱
// 流程：POST /sessions 登记代码（待连接）→ WS /ws?session= 连接时真正 spawn PTY 进程
//  - python: python3 -u main.py（-u 关闭输出缓冲，input() 逐行交互）
//  - cpp:    g++ 编译后 ./main
//  - c:      gcc 编译后 ./main
// 图形（pygame 弹窗兼容）：每个会话启动时分配一块 Xvfb 虚拟屏幕（DISPLAY 注入进程环境），
// 画面经 x11vnc 编码，浏览器通过 WS /vnc?session= 桥接到 x11vnc 的 TCP 端口（noVNC 客户端渲染）。
// 资源与安全：ulimit（内存 512MB / CPU 300s）、会话 TTL 30 分钟、空闲 10 分钟回收、
//            目录隔离 /app/sessions、最大并发会话数。
const http = require('http');
const fs = require('fs');
const net = require('net');
const path = require('path');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');
const pty = require('node-pty');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = Number(process.env.PORT || 4100);
const MAX_SESSIONS = Number(process.env.MAX_SESSIONS || 20);
const MAX_CODE = 200000;                       // 200KB
const SESSION_TTL_MS = 30 * 60 * 1000;         // 会话硬上限 30 分钟
const IDLE_TIMEOUT_MS = 10 * 60 * 1000;        // 空闲回收 10 分钟
const PENDING_TTL_MS = 2 * 60 * 1000;          // 登记后 2 分钟内不连接则作废
// 虚拟屏幕参数：display :100 起分配；x11vnc 端口 = 5900 + (display - 100)
const DISPLAY_BASE = 100;
const DISPLAY_MAX = 199;
const VNC_PORT_BASE = 5900;
const VIRTUAL_SCREEN = '1024x768x24';
// 注意：会话目录必须位于可执行文件系统上（Windows Docker 的 tmpfs 默认 noexec，
// 放在 /tmp 会导致编译出的二进制 Permission denied），故用 /app/sessions。
const ROOT = '/app/sessions';

// 启动时清空历史会话残留（容器重启后旧进程已死，目录无主）
fs.rmSync(ROOT, { recursive: true, force: true });
fs.mkdirSync(ROOT, { recursive: true, mode: 0o700 });

// sessionId -> { language, code, createdAt }（等待 WS 连接的"登记"状态）
const pending = new Map();
// sessionId -> { proc, ws, dir, createdAt, lastActiveAt, displayNum, vncPort, xvfb, openbox, vnc }（运行中）
const sessions = new Map();
// 虚拟屏占用表
const usedDisplays = new Set();

function log(...args) {
  console.log(`[term-runner ${new Date().toISOString()}]`, ...args);
}

// 分配一块虚拟屏幕编号（:100 ~ :199）
function allocDisplay() {
  for (let n = DISPLAY_BASE; n <= DISPLAY_MAX; n++) {
    if (!usedDisplays.has(n)) {
      usedDisplays.add(n);
      return n;
    }
  }
  return null;
}

function freeDisplay(n) {
  if (n) usedDisplays.delete(n);
}

// 启动虚拟屏幕（Xvfb + openbox）：pygame/SDL 程序需要 DISPLAY 才能创建窗口
// +extension GLX/RENDER：SDL 建窗口需要 OpenGL 上下文（软件渲染 llvmpipe）
function startVirtualDisplay(sessionId, displayNum) {
  const xvfb = spawn('Xvfb', [
    `:${displayNum}`,
    '-screen', '0', VIRTUAL_SCREEN,
    '-nolisten', 'tcp',
    '-ac',
    '+extension', 'GLX',
    '+extension', 'RENDER',
    '-noreset',
  ], {
    stdio: 'ignore',
  });
  xvfb.on('error', () => { /* 记录由退出码兜底 */ });
  // openbox 提供窗口标题栏与拖动/缩放（等待 Xvfb 就绪）
  const openbox = spawn('openbox', ['--display', `:${displayNum}`], { stdio: 'ignore' });
  openbox.on('error', () => { /* 忽略 */ });
  log(`session ${sessionId}: virtual display :${displayNum} (Xvfb+openbox)`);
  return { xvfb, openbox };
}

// 等待 Xvfb 的 X socket 就绪（避免 python 在 X 服务器起来前启动而崩溃/退出）
function waitForX(displayNum, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const sock = `/tmp/.X11-unix/X${displayNum}`;
    const t0 = Date.now();
    const check = () => {
      if (fs.existsSync(sock)) return resolve();
      if (Date.now() - t0 > timeoutMs) return reject(new Error('虚拟屏幕启动超时'));
      setTimeout(check, 100);
    };
    check();
  });
}

// 启动 x11vnc（-once：画面客户端断开后自动退出，杜绝僵尸进程占端口）
// 就绪信号 = stderr 出现 "PORT=" 行（比探测端口可靠：不会被残留进程的端口骗过）
function spawnVncOnce(s) {
  return new Promise((resolve, reject) => {
    // 注意：不能加 -quiet（会吞掉 "PORT=" 就绪信号行）
    const vnc = spawn('x11vnc', [
      '-display', `:${s.displayNum}`,
      '-rfbport', String(s.vncPort),
      '-once', '-shared', '-nopw', '-localhost',
      '-noxdamage',
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      vnc.kill();
      reject(new Error('画面服务启动超时'));
    }, 8000);
    timer.unref();
    const onChunk = (chunk) => {
      out += chunk.toString();
      if (!settled && /PORT=/.test(out)) {
        settled = true;
        clearTimeout(timer);
        resolve(vnc);
      }
    };
    vnc.stdout.on('data', onChunk);
    vnc.stderr.on('data', onChunk);
    vnc.on('error', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error('画面服务启动失败'));
    });
    vnc.on('exit', () => {
      if (settled) return; // 正常使用中退出由 -once 触发，不算错误
      settled = true;
      clearTimeout(timer);
      reject(new Error(`画面服务退出：${out.slice(-200)}`));
    });
  });
}

// 等待 x11vnc 端口就绪
function waitForPort(port, timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const tryOnce = () => {
      const sock = net.connect(port, '127.0.0.1');
      const fail = () => {
        sock.destroy();
        if (Date.now() - t0 > timeoutMs) reject(new Error('vnc port timeout'));
        else setTimeout(tryOnce, 200);
      };
      sock.once('connect', () => {
        sock.destroy();
        resolve();
      });
      sock.once('error', fail);
    };
    tryOnce();
  });
}

function cleanup(id) {
  const s = sessions.get(id);
  if (!s) return;
  sessions.delete(id);
  try { s.proc.kill(); } catch { /* 已退出 */ }
  try { s.vnc?.kill(); } catch { /* 未启动 */ }
  try { s.openbox?.kill(); } catch { /* 未启动 */ }
  try { s.xvfb?.kill(); } catch { /* 未启动 */ }
  freeDisplay(s.displayNum);
  fs.rmSync(s.dir, { recursive: true, force: true });
  log(`session ${id} cleaned (sessions=${sessions.size})`);
}

// 周期清扫：过期会话 / 过期登记
const sweep = setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.createdAt > SESSION_TTL_MS) {
      try { s.ws?.close(4001, '会话超时，已回收'); } catch { /* 忽略 */ }
      cleanup(id);
      log(`session ${id} expired (TTL)`);
    } else if (now - s.lastActiveAt > IDLE_TIMEOUT_MS) {
      try { s.ws?.close(4001, '长时间无操作，会话已回收'); } catch { /* 忽略 */ }
      cleanup(id);
      log(`session ${id} expired (idle)`);
    }
  }
  for (const [id, p] of pending) {
    if (now - p.createdAt > PENDING_TTL_MS) pending.delete(id);
  }
}, 30000);
sweep.unref();

async function startSession(sessionId) {
  const spec = pending.get(sessionId);
  if (!spec) return { error: '会话不存在或已过期，请重新启动' };
  pending.delete(sessionId);

  const dir = path.join(ROOT, sessionId);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });

  let cmd;
  if (spec.language === 'python') {
    fs.writeFileSync(path.join(dir, 'main.py'), spec.code);
    cmd = `cd "${dir}" && ulimit -v 8388608 && ulimit -t 300 && python3 -u main.py`;
  } else if (spec.language === 'cpp') {
    fs.writeFileSync(path.join(dir, 'main.cpp'), spec.code);
    const cc = spawnSync('g++', ['-O2', '-o', 'main', 'main.cpp'], {
      cwd: dir,
      timeout: 30000,
      encoding: 'utf8',
    });
    if (cc.status !== 0) {
      const errOut = String(cc.stderr || cc.stdout || '未知编译错误').slice(0, 4000);
      fs.rmSync(dir, { recursive: true, force: true });
      return { error: `编译失败：\n${errOut}` };
    }
    cmd = `cd "${dir}" && ulimit -v 8388608 && ulimit -t 300 && ./main`;
  } else if (spec.language === 'c') {
    fs.writeFileSync(path.join(dir, 'main.c'), spec.code);
    const cc = spawnSync('gcc', ['-O2', '-o', 'main', 'main.c'], {
      cwd: dir,
      timeout: 30000,
      encoding: 'utf8',
    });
    if (cc.status !== 0) {
      const errOut = String(cc.stderr || cc.stdout || '未知编译错误').slice(0, 4000);
      fs.rmSync(dir, { recursive: true, force: true });
      return { error: `编译失败：\n${errOut}` };
    }
    cmd = `cd "${dir}" && ulimit -v 8388608 && ulimit -t 300 && ./main`;
  } else {
    fs.rmSync(dir, { recursive: true, force: true });
    return { error: '不支持的语言' };
  }

  // 分配虚拟屏幕（pygame/SDL 弹窗用）：Xvfb + openbox，DISPLAY 注入进程环境
  const displayNum = allocDisplay();
  if (displayNum === null) {
    fs.rmSync(dir, { recursive: true, force: true });
    return { error: '虚拟屏幕已用尽，请稍后再试' };
  }
  const vncPort = VNC_PORT_BASE + (displayNum - DISPLAY_BASE);
  const display = startVirtualDisplay(sessionId, displayNum);

  // 等 X 服务器就绪再启动用户程序（否则 SDL 连接失败导致秒退/崩溃）
  try {
    await waitForX(displayNum);
  } catch (err) {
    try { display.xvfb.kill(); } catch { /* 忽略 */ }
    try { display.openbox.kill(); } catch { /* 忽略 */ }
    freeDisplay(displayNum);
    fs.rmSync(dir, { recursive: true, force: true });
    return { error: err.message };
  }

  const proc = pty.spawn('/bin/bash', ['-c', cmd], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: dir,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      COLUMNS: '80',
      LINES: '24',
      DISPLAY: `:${displayNum}`,
      SDL_VIDEODRIVER: 'x11',
      SDL_AUDIODRIVER: 'dummy',
      LIBGL_ALWAYS_SOFTWARE: '1',
      PYGAME_HIDE_SUPPORT_PROMPT: '1',
      XDG_RUNTIME_DIR: '/tmp',
    },
  });

  sessions.set(sessionId, {
    proc,
    ws: null,
    dir,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    displayNum,
    vncPort,
    xvfb: display.xvfb,
    openbox: display.openbox,
    vnc: null,
  });
  log(`session ${sessionId} started (${spec.language}, display :${displayNum}, sessions=${sessions.size})`);
  return { ok: true };
}

// ── HTTP：健康检查 + 会话登记 ──
const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, sessions: sessions.size, pending: pending.size }));
    return;
  }
  if (req.method === 'POST' && req.url === '/sessions') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 400000) req.destroy(); });
    req.on('end', () => {
      let spec;
      try { spec = JSON.parse(body || '{}'); } catch { spec = {}; }
      const language = String(spec.language || '');
      const code = String(spec.code || '');
      if (language !== 'python' && language !== 'cpp' && language !== 'c') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '仅支持 python / cpp / c' }));
        return;
      }
      if (!code.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '代码不能为空' }));
        return;
      }
      if (code.length > MAX_CODE) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `代码过长（最大 ${MAX_CODE / 1000}KB）` }));
        return;
      }
      if (sessions.size + pending.size >= MAX_SESSIONS) {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `终端会话已满（上限 ${MAX_SESSIONS}），请稍后再试` }));
        return;
      }
      const id = crypto.randomBytes(12).toString('hex');
      pending.set(id, { language, code, createdAt: Date.now() });
      log(`session ${id} registered (${language})`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ session_id: id }));
    });
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

// ── WS 通道：终端流 /ws 与画面流 /vnc ──
// 注意：多个 WebSocketServer 必须用 noServer + 单一 upgrade 分发（官方多通道模式）。
// 直接给多个 WSS 传 { server } 会导致升级后的 socket 仍被 HTTP 解析器监听，
// 把 400 Bad Request 写进 WS 字节流（帧损坏）。
// 入站消息上限：终端按键/粘贴与 RFB 客户端事件都是小包，
// 限制单条消息大小可防超大帧撑爆内存（默认 100MB 过宽）。
const WS_MAX_PAYLOAD = 4 * 1024 * 1024;

const wss = new WebSocketServer({ noServer: true, perMessageDeflate: true, maxPayload: WS_MAX_PAYLOAD });
const vncWss = new WebSocketServer({ noServer: true, perMessageDeflate: true, maxPayload: WS_MAX_PAYLOAD });

server.on('upgrade', (req, socket, head) => {
  let pathname = '';
  try {
    pathname = new URL(req.url, 'http://x').pathname;
  } catch { /* 忽略 */ }
  if (pathname === '/ws') {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
    return;
  }
  if (pathname === '/vnc') {
    vncWss.handleUpgrade(req, socket, head, (ws) => vncWss.emit('connection', ws, req));
    return;
  }
  socket.destroy();
});

// ── WS：真正启动 PTY 并双向流 ──

wss.on('connection', async (ws, req) => {
  let sessionId = '';
  try {
    sessionId = new URL(req.url, 'http://x').searchParams.get('session') || '';
  } catch { /* 忽略 */ }
  if (!/^[a-f0-9]{16,40}$/.test(sessionId)) {
    ws.close(4000, '非法会话');
    return;
  }
  const existing = sessions.get(sessionId);
  if (existing && existing.ws) {
    ws.close(4002, '会话已被占用');
    return;
  }

  // 已运行会话（断线重连）或首次启动
  let s = existing;
  if (!s) {
    const result = await startSession(sessionId);
    if (result.error) {
      try { ws.send(JSON.stringify({ type: 'error', message: result.error })); } catch { /* 忽略 */ }
      ws.close(4000, result.error.slice(0, 120));
      return;
    }
    s = sessions.get(sessionId);
  }

  s.ws = ws;
  s.lastActiveAt = Date.now();
  ws.send(JSON.stringify({ type: 'ready' }));

  s.proc.onData((data) => {
    s.lastActiveAt = Date.now();
    try { ws.send(data); } catch { /* 连接已断 */ }
  });
  s.proc.onExit(({ exitCode, signal }) => {
    try {
      ws.send(JSON.stringify({ type: 'exit', code: exitCode, signal }));
    } catch { /* 忽略 */ }
    log(`session ${sessionId} exited (code=${exitCode}, signal=${signal})`);
    // 延迟清理，让前端有足够时间渲染退出信息
    const timer = setTimeout(() => cleanup(sessionId), 3000);
    timer.unref();
  });

  ws.on('message', (raw) => {
    s.lastActiveAt = Date.now();
    try { s.proc.write(raw.toString()); } catch { /* 进程已退出 */ }
  });
  ws.on('close', () => {
    if (sessions.get(sessionId) && sessions.get(sessionId).ws === ws) cleanup(sessionId);
  });
  ws.on('error', () => { /* 忽略 */ });
});

// ── VNC 画面流（pygame 弹窗）：WS /vnc?session= →（按需启动 x11vnc）→ TCP 桥接 ──

vncWss.on('connection', (ws, req) => {
  let sessionId = '';
  try {
    sessionId = new URL(req.url, 'http://x').searchParams.get('session') || '';
  } catch { /* 忽略 */ }
  if (!/^[a-f0-9]{16,40}$/.test(sessionId)) {
    ws.close(4000, '非法会话');
    return;
  }
  const s = sessions.get(sessionId);
  if (!s) {
    ws.close(4000, '会话不存在');
    return;
  }

  (async () => {
    // 每次画面连接都启动专属 x11vnc（-once：客户端断开即退出，杜绝僵尸进程占端口）
    let vnc;
    try {
      vnc = await spawnVncOnce(s);
    } catch (err) {
      ws.close(1011, err.message || '画面服务启动失败');
      return;
    }
    s.vnc = vnc;
    log(`session ${sessionId}: x11vnc on :${s.vncPort}`);
    vnc.on('exit', () => {
      if (s.vnc === vnc) s.vnc = null; // 断开后置空，下次连接重新启动
    });

    // TCP ↔ WS 字节桥（RFB 协议原样透传，noVNC 负责握手与渲染）
    const sock = net.connect(s.vncPort, '127.0.0.1');
    const kill = () => {
      try { sock.destroy(); } catch { /* 忽略 */ }
      try { ws.close(); } catch { /* 忽略 */ }
    };
    sock.on('connect', () => {
      sock.on('data', (chunk) => {
        if (ws.readyState === WebSocket.OPEN) {
          try { ws.send(chunk, { binary: true }); } catch { /* 忽略 */ }
        }
      });
      sock.on('error', kill);
      sock.on('close', kill);
    });
    sock.on('error', () => {
      ws.close(1011, '画面服务不可用');
    });
    ws.on('message', (raw) => {
      if (!sock.destroyed) {
        try { sock.write(Buffer.isBuffer(raw) ? raw : Buffer.from(raw)); } catch { /* 忽略 */ }
      }
    });
    ws.on('close', () => {
      try { sock.destroy(); } catch { /* 忽略 */ }
      // 关窗不杀 x11vnc：重新开窗可快速重连（会话结束时统一清理）
    });
    ws.on('error', kill);
  })();
});

server.listen(PORT, () => {
  log(`term-runner listening on :${PORT} (max sessions ${MAX_SESSIONS})`);
});
