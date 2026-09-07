// 管理员后台 API：用户管理（审核）、系统监控、执行日志
const express = require('express');
const os = require('os');
const fs = require('fs');
const net = require('net');
const { execFile } = require('child_process');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const db = require('../db');
const config = require('../config');
const HttpError = require('../utils/HttpError');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validate, PASSWORD_RE, PASSWORD_MSG } = require('../middleware/validation');
const { logger, maskEmail } = require('../utils/logger');
const piston = require('../services/piston');

const router = express.Router();
router.use(requireAuth, requireAdmin);

// 网络探测目标（TCP 连接计时，纯 Node 实现，无需 ping 权限）
const NET_PROBE_TARGETS = String(config.NET_PROBE_TARGETS || '223.5.5.5:53,1.1.1.1:443')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) => {
    const [host, port] = s.split(':');
    return { host, port: Number(port) || 80 };
  });

function tcpProbe(host, port, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    let done = false;
    const finish = (ok, latencyMs) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve({ host, port, ok, latency_ms: ok ? latencyMs : null });
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true, Date.now() - start));
    socket.once('timeout', () => finish(false, null));
    socket.once('error', () => finish(false, null));
    socket.connect(port, host);
  });
}

// GPU 探测：尽力而为调用 nvidia-smi（容器内未装/无 GPU 时返回 available:false）
function gpuProbe() {
  return new Promise((resolve) => {
    try {
      execFile(
        'nvidia-smi',
        ['--query-gpu=name,memory.used,memory.total,utilization.gpu', '--format=csv,noheader,nounits'],
        { timeout: 2000 },
        (err, stdout) => {
          if (err) return resolve({ available: false });
          const line = String(stdout || '').trim().split('\n')[0] || '';
          const [name, used, total, util] = line.split(',').map((s) => (s || '').trim());
          resolve({
            available: true,
            name: name || 'NVIDIA GPU',
            memoryUsedMb: Number(used) || 0,
            memoryTotalMb: Number(total) || 0,
            utilization: Number(util) || 0,
          });
        },
      );
    } catch {
      resolve({ available: false });
    }
  });
}

// GET /api/admin/stats -> { counts: {...} }
router.get('/stats', (req, res) => {
  const count = (sql) => db.prepare(sql).get().c;
  res.json({
    counts: {
      users: count('SELECT COUNT(*) c FROM users'),
      pending: count("SELECT COUNT(*) c FROM users WHERE status = 'pending'"),
      active: count("SELECT COUNT(*) c FROM users WHERE status = 'active'"),
      rejected: count("SELECT COUNT(*) c FROM users WHERE status = 'rejected'"),
      projects: count('SELECT COUNT(*) c FROM projects'),
      files: count('SELECT COUNT(*) c FROM files'),
      executions: count('SELECT COUNT(*) c FROM execution_logs'),
    },
  });
});

// GET /api/admin/users -> { users: [...] }（含注册指纹）
router.get('/users', (req, res) => {
  const users = db
    .prepare(
      `SELECT id, email, role, status, ip_address, location, user_agent, created_at, registered_at
       FROM users ORDER BY id DESC LIMIT 200`,
    )
    .all();
  res.json({ users });
});

function getUserById(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(404, '用户不存在');
  const user = db.prepare('SELECT id, email, role, status FROM users WHERE id = ?').get(id);
  if (!user) throw new HttpError(404, '用户不存在');
  return user;
}

function guardAdminTarget(target) {
  if (target.role === 'admin' || target.email === config.ADMIN_USERNAME) {
    throw new HttpError(400, '不能修改管理员账号');
  }
}

// POST /api/admin/users/:id/approve -> { success, user }（待审核 → 已激活 / 拒绝后重新放行）
router.post('/users/:id/approve', (req, res) => {  const target = getUserById(req.params.id);
  guardAdminTarget(target);
  db.prepare("UPDATE users SET status = 'active' WHERE id = ?").run(target.id);
  logger.info(`[admin] ${maskEmail(req.user.email)} 通过审核 ${maskEmail(target.email)}`);
  res.json({ success: true, user: { id: target.id, email: target.email, status: 'active' } });
});

// POST /api/admin/users/:id/reject -> { success, user }（拒绝注册 / 封禁已激活账号）
router.post('/users/:id/reject', (req, res) => {
  const target = getUserById(req.params.id);
  guardAdminTarget(target);
  db.prepare("UPDATE users SET status = 'rejected' WHERE id = ?").run(target.id);
  logger.info(`[admin] ${maskEmail(req.user.email)} 拒绝/封禁 ${maskEmail(target.email)}`);
  res.json({ success: true, user: { id: target.id, email: target.email, status: 'rejected' } });
});

// POST /api/admin/users/:id/password  { newPassword } -> { success }
// 管理员可重置用户密码（只能修改，永远无法查看任何密码/哈希）；新密码强制复杂度
router.post(
  '/users/:id/password',
  validate([body('newPassword').isString().matches(PASSWORD_RE).withMessage(PASSWORD_MSG)]),
  (req, res) => {
    const target = getUserById(req.params.id);
    guardAdminTarget(target);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
      bcrypt.hashSync(req.body.newPassword, 10),
      target.id,
    );
    logger.info(`[admin] ${maskEmail(req.user.email)} 重置密码 ${maskEmail(target.email)}`);
    res.json({ success: true, user: { id: target.id, email: target.email } });
  },
);

// GET /api/admin/logs?limit=100 -> { logs: [...] }
router.get('/logs', (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const logs = db
    .prepare(
      `SELECT l.id, l.language, l.exit_code, l.execution_time, l.status, l.code_length, l.created_at,
              COALESCE(u.email, '(已删除用户)') AS email
       FROM execution_logs l
       LEFT JOIN users u ON u.id = l.user_id
       ORDER BY l.id DESC LIMIT ?`,
    )
    .all(limit);
  res.json({ logs });
});

// GET /api/admin/monitor -> 系统监控快照（含网络延迟、GPU、引擎延迟）
router.get('/monitor', async (req, res) => {
  const mem = process.memoryUsage();

  // Piston：健康 + 往返延迟
  let pistonStatus = { ok: false, latency_ms: null, runtimes: [] };
  try {
    const t0 = Date.now();
    const runtimes = await piston.ping(2500);
    pistonStatus = {
      ok: true,
      latency_ms: Date.now() - t0,
      runtimes: runtimes.map((r) => `${r.language}@${r.version}`),
    };
  } catch {
    pistonStatus = { ok: false, latency_ms: null, runtimes: [] };
  }

  // 网络探测 + GPU 探测并行执行（各自有超时，不会拖慢整个接口）
  const [network, gpu] = await Promise.all([
    Promise.all(NET_PROBE_TARGETS.map((t) => tcpProbe(t.host, t.port))),
    gpuProbe(),
  ]);

  let dbSize = 0;
  try {
    dbSize = fs.statSync(config.DB_PATH).size;
  } catch { /* 忽略 */ }

  res.json({
    timestamp: Date.now(),
    uptime: { process: process.uptime(), system: os.uptime() },
    node: { version: process.version },
    os: {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      loadavg: os.loadavg(),
      totalmem: os.totalmem(),
      freemem: os.freemem(),
    },
    memory: { rss: mem.rss, heapUsed: mem.heapUsed, heapTotal: mem.heapTotal },
    db: { sizeBytes: dbSize },
    network: { targets: network },
    gpu,
    piston: pistonStatus,
  });
});

module.exports = router;
