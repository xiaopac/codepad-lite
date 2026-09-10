// 终端会话的每用户并发配额（内存态）
//  - 登记即占用（POST /sessions 成功）；
//  - WebSocket 关闭时释放；
//  - 登记后 2 分钟未连接自动过期释放（与 term-runner 的 PENDING_TTL 对齐）。
const config = require('./config');

const active = new Map(); // userId -> Map(sessionId -> createdAt)

const PENDING_RELEASE_MS = 2 * 60 * 1000;

function tryAcquire(userId, sessionId) {
  let m = active.get(userId);
  if (!m) {
    m = new Map();
    active.set(userId, m);
  }
  const now = Date.now();
  for (const [id, ts] of m) {
    if (now - ts > PENDING_RELEASE_MS) m.delete(id); // 过期登记自动释放
  }
  if (m.size >= config.TERM_SESSIONS_PER_USER) return false;
  m.set(sessionId, now);
  return true;
}

function release(userId, sessionId) {
  const m = active.get(userId);
  if (!m) return;
  m.delete(sessionId);
  if (m.size === 0) active.delete(userId);
}

function countOf(userId) {
  const m = active.get(userId);
  if (!m) return 0;
  const now = Date.now();
  for (const [id, ts] of m) {
    if (now - ts > PENDING_RELEASE_MS) m.delete(id);
  }
  return m.size;
}

module.exports = { tryAcquire, release, countOf };
