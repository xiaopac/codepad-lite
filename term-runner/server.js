// CodePad Lite term-runner：交互式终端沙箱
// 流程：POST /sessions 登记代码（待连接）→ WS /ws?session= 连接时真正 spawn PTY 进程
//  - python: python3 -u main.py（-u 关闭输出缓冲，input() 逐行交互）
//  - cpp:    g++ 编译后 ./main
// 资源与安全：ulimit（内存 512MB / CPU 300s）、会话 TTL 30 分钟、空闲 10 分钟回收、
//            目录隔离 /tmp/term-sessions/<id>、最大并发会话数。
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const pty = require('node-pty');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT || 4100);
const MAX_SESSIONS = Number(process.env.MAX_SESSIONS || 20);
const MAX_CODE = 200000;                       // 200KB
const SESSION_TTL_MS = 30 * 60 * 1000;         // 会话硬上限 30 分钟
const IDLE_TIMEOUT_MS = 10 * 60 * 1000;        // 空闲回收 10 分钟
const PENDING_TTL_MS = 2 * 60 * 1000;          // 登记后 2 分钟内不连接则作废
// 注意：会话目录必须位于可执行文件系统上（Windows Docker 的 tmpfs 默认 noexec，
// 放在 /tmp 会导致编译出的二进制 Permission denied），故用 /app/sessions。
const ROOT = '/app/sessions';

// 启动时清空历史会话残留（容器重启后旧进程已死，目录无主）
fs.rmSync(ROOT, { recursive: true, force: true });
fs.mkdirSync(ROOT, { recursive: true, mode: 0o700 });

// sessionId -> { language, code, createdAt }（等待 WS 连接的"登记"状态）
const pending = new Map();
// sessionId -> { proc, ws, dir, createdAt, lastActiveAt }（运行中）
const sessions = new Map();

function log(...args) {
  console.log(`[term-runner ${new Date().toISOString()}]`, ...args);
}

function cleanup(id) {
  const s = sessions.get(id);
  if (!s) return;
  sessions.delete(id);
  try { s.proc.kill(); } catch { /* 已退出 */ }
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

function startSession(sessionId) {
  const spec = pending.get(sessionId);
  if (!spec) return { error: '会话不存在或已过期，请重新启动' };
  pending.delete(sessionId);

  const dir = path.join(ROOT, sessionId);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });

  let cmd;
  if (spec.language === 'python') {
    fs.writeFileSync(path.join(dir, 'main.py'), spec.code);
    cmd = `cd "${dir}" && ulimit -v 524288 && ulimit -t 300 && python3 -u main.py`;
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
    cmd = `cd "${dir}" && ulimit -v 524288 && ulimit -t 300 && ./main`;
  } else {
    fs.rmSync(dir, { recursive: true, force: true });
    return { error: '不支持的语言' };
  }

  const proc = pty.spawn('/bin/bash', ['-c', cmd], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: dir,
    env: { ...process.env, TERM: 'xterm-256color', COLUMNS: '80', LINES: '24' },
  });

  sessions.set(sessionId, {
    proc,
    ws: null,
    dir,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
  });
  log(`session ${sessionId} started (${spec.language}, sessions=${sessions.size})`);
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
      if (language !== 'python' && language !== 'cpp') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '仅支持 python / cpp' }));
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

// ── WS：真正启动 PTY 并双向流 ──
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
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
    const result = startSession(sessionId);
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

server.listen(PORT, () => {
  log(`term-runner listening on :${PORT} (max sessions ${MAX_SESSIONS})`);
});
