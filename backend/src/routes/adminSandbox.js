// 管理员后台：终端沙箱第三方库管理（查看 / 安装 / 卸载）
//
// 为什么要绕一圈：沙箱容器（term-runner）只挂 internal 网络、没有外网，装不了库。
// 所以由 env-builder（有外网）把包装进共享卷 /pkgs/sandbox，
// term-runner 通过 PYTHONPATH=/sandbox-pkgs 读取 —— 沙箱依旧是离线的，用户代码也拿不到外网。
// 系统级组件（tkinter 这类 apt 包）pip 装不了，只能改 term-runner 镜像的构建参数后重建。
const express = require('express');
const config = require('../config');
const db = require('../db');
const HttpError = require('../utils/HttpError');
const { logger } = require('../utils/logger');
const { getSandboxEnv, invalidateSandboxEnv } = require('../services/sandboxEnv');

const router = express.Router();

const PKG_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const MAX_PACKAGES = 10;
const JOB_TIMEOUT_MS = 420000; // env-builder 总预算 400s，留出余量
const LOG_MAX_CHARS = 20000;   // 单条日志入库上限
const LOG_KEEP_ROWS = 500;     // 只保留最近 500 条操作记录

// 最近一次作业（内存态，供管理面板展示实时进度；历史记录在数据库里）
let job = null;

const insertLog = db.prepare(
  'INSERT INTO sandbox_package_logs (admin_id, admin_email, action, packages, status) VALUES (?, ?, ?, ?, ?)',
);
const finishLog = db.prepare(
  `UPDATE sandbox_package_logs
      SET status = ?, error = ?, log = ?, finished_at = CURRENT_TIMESTAMP, duration_ms = ?
    WHERE id = ?`,
);
const pruneLogs = db.prepare(
  'DELETE FROM sandbox_package_logs WHERE id <= (SELECT MAX(id) FROM sandbox_package_logs) - ?',
);
const selectLogs = db.prepare(
  `SELECT id, admin_email, action, packages, status, error, duration_ms, created_at, finished_at,
          length(COALESCE(log, '')) AS log_size
     FROM sandbox_package_logs ORDER BY id DESC LIMIT ?`,
);
const selectLog = db.prepare('SELECT * FROM sandbox_package_logs WHERE id = ?');

// 后端重启后，之前标记为「进行中」的记录不可能还在跑：启动时统一收敛为中断失败，
// 否则日志列表会永远显示「进行中」。
try {
  const stale = db
    .prepare(
      `UPDATE sandbox_package_logs
          SET status = 'error', error = '后台重启，任务被中断', finished_at = CURRENT_TIMESTAMP
        WHERE status = 'running'`,
    )
    .run();
  if (stale.changes > 0) logger.warn(`[sandbox] ${stale.changes} 条沙箱库操作因重启中断，已标记为失败`);
} catch (err) {
  logger.warn(`[sandbox] 中断记录清理失败：${err.message}`);
}

function parseRow(row) {
  if (!row) return null;
  let packages = [];
  try {
    packages = JSON.parse(row.packages || '[]');
  } catch { /* 脏数据忽略 */ }
  return { ...row, packages };
}

// SQLite CURRENT_TIMESTAMP 是 UTC 的 "YYYY-MM-DD HH:MM:SS"，统一转成毫秒时间戳给前端
function toMs(value) {
  if (!value) return null;
  const ms = Date.parse(`${String(value).replace(' ', 'T')}Z`);
  return Number.isFinite(ms) ? ms : null;
}

function publicJob(j) {
  if (!j) return null;
  return {
    id: j.id,
    action: j.action,
    packages: j.packages,
    status: j.status, // running | done | error
    error: j.error,
    log: j.log,
    startedAt: j.startedAt,
    finishedAt: j.finishedAt,
  };
}

function startJob(action, packages, admin, runner) {
  // 先落库拿到 id：这样即使后端重启，历史里也有"进行中"这条记录
  let rowId = null;
  try {
    rowId = insertLog.run(admin?.id ?? null, admin?.email ?? null, action, JSON.stringify(packages), 'running').lastInsertRowid;
    pruneLogs.run(LOG_KEEP_ROWS);
  } catch (err) {
    logger.warn(`[sandbox] 操作日志写入失败：${err.message}`);
  }

  const j = {
    id: rowId ? String(rowId) : `${Date.now().toString(36)}`,
    rowId,
    action,
    packages,
    status: 'running',
    error: null,
    log: '',
    startedAt: Date.now(),
    finishedAt: null,
  };
  job = j;
  logger.info(`[sandbox] ${action} ${packages.join(' ')} 开始（${admin?.email || '未知管理员'}，记录 #${rowId}）`);

  const settle = (status, error, log) => {
    j.status = status;
    j.error = error;
    j.log = log || '';
    j.finishedAt = Date.now();
    if (rowId) {
      try {
        finishLog.run(status, error, j.log.slice(-LOG_MAX_CHARS), j.finishedAt - j.startedAt, rowId);
      } catch (err) {
        logger.warn(`[sandbox] 操作日志更新失败：${err.message}`);
      }
    }
  };

  runner()
    .then((log) => {
      settle('done', null, log);
      logger.info(`[sandbox] ${action} ${packages.join(' ')} 完成（${j.finishedAt - j.startedAt}ms）`);
    })
    .catch((err) => {
      settle('error', err.message || String(err), j.log);
      logger.warn(`[sandbox] ${action} ${packages.join(' ')} 失败：${j.error}`);
    });
  return j;
}

function normalizePackages(raw) {
  const list = Array.isArray(raw) ? raw : String(raw ?? '').split(/[\s,，]+/);
  const out = [];
  for (const item of list) {
    const name = String(item ?? '').trim();
    if (!name) continue;
    if (!PKG_RE.test(name)) throw new HttpError(400, `库名不合法：${name}`);
    if (!out.includes(name)) out.push(name);
  }
  if (out.length === 0) throw new HttpError(400, '请填写要处理的库名');
  if (out.length > MAX_PACKAGES) throw new HttpError(400, `一次最多处理 ${MAX_PACKAGES} 个库`);
  return out;
}

async function callEnvBuilder(path, payload) {
  let r;
  try {
    r = await fetch(`${config.ENV_BUILDER_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(JOB_TIMEOUT_MS),
    });
  } catch {
    throw new Error('安装服务不可用（env-builder），请检查容器状态');
  }
  const data = await r.json().catch(() => null);
  if (!r.ok) throw new Error(data?.error || `安装服务返回 HTTP ${r.status}`);
  return data || {};
}

// 装/卸完成后让沙箱重新探测（清掉两处缓存），否则界面还是旧清单
async function refreshSandboxInfo() {
  invalidateSandboxEnv();
  try {
    await getSandboxEnv({ refresh: true, ttl: 0 });
  } catch {
    /* 探测失败不影响安装结果本身 */
  }
}

// ── GET /api/admin/sandbox：沙箱环境全貌 + 最近一次作业 ──
router.get('/', async (req, res) => {
  const env = await getSandboxEnv({ refresh: false, ttl: 60 * 1000 });
  // 没有正在跑的作业时，用数据库里最后一条记录回显（后端重启后界面照样有结果）
  let last = job ? publicJob(job) : null;
  if (!last) {
    const row = db.prepare('SELECT * FROM sandbox_package_logs ORDER BY id DESC LIMIT 1').get();
    if (row) {
      const parsed = parseRow(row);
      last = {
        id: String(parsed.id),
        action: parsed.action,
        packages: parsed.packages,
        status: parsed.status === 'running' ? 'error' : parsed.status, // 重启后残留的 running 视为中断
        error: parsed.status === 'running' ? '后台重启，任务被中断' : parsed.error,
        log: parsed.log || '',
        startedAt: toMs(parsed.created_at),
        finishedAt: toMs(parsed.finished_at),
      };
    }
  }
  res.json({
    env,
    job: last,
    // 系统级组件的追加方式（界面据此给出可复制的命令）
    aptExtra: config.APT_EXTRA_PACKAGES || '',
    buildTarget: config.SANDBOX_BUILD_TARGET,
  });
});

// ── GET /api/admin/sandbox/logs：操作日志列表（不含正文，正文用详情接口取） ──
router.get('/logs', (req, res) => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  const rows = selectLogs.all(limit).map((r) => {
    const parsed = parseRow(r);
    return {
      id: parsed.id,
      admin_email: parsed.admin_email,
      action: parsed.action,
      packages: parsed.packages,
      status: parsed.status,
      error: parsed.error,
      duration_ms: parsed.duration_ms,
      created_at: parsed.created_at,
      finished_at: parsed.finished_at,
      log_size: parsed.log_size,
    };
  });
  res.json({ logs: rows });
});

// ── GET /api/admin/sandbox/logs/:id：单条日志详情（含完整 pip 输出） ──
router.get('/logs/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, '日志 id 不合法');
  const row = parseRow(selectLog.get(id));
  if (!row) throw new HttpError(404, '日志不存在');
  res.json({ log: row });
});

// ── POST /api/admin/sandbox/packages { packages }：安装 pip 库到沙箱 ──
router.post('/packages', async (req, res) => {
  if (job && job.status === 'running') throw new HttpError(409, '上一个任务仍在进行，请稍候');
  const packages = normalizePackages(req.body?.packages ?? req.body?.package);

  const env = await getSandboxEnv({ refresh: true, ttl: 60 * 1000 });
  const py = String(env.python || '').split('.').slice(0, 2).join('.');
  if (!/^3\.(9|10|11)$/.test(py)) {
    throw new HttpError(503, `沙箱 Python 版本暂不支持装库：${env.python || '未知'}`);
  }

  const started = startJob('install', packages, req.user, async () => {
    const data = await callEnvBuilder('/build', {
      target: config.SANDBOX_BUILD_TARGET,
      python_version: py,
      packages,
    });
    await refreshSandboxInfo();
    return data.log || `已安装：${packages.join(' ')}`;
  });
  res.json({ job: publicJob(started) });
});

// ── DELETE /api/admin/sandbox/packages/:name：从沙箱卸载 ──
router.delete('/packages/:name', async (req, res) => {
  if (job && job.status === 'running') throw new HttpError(409, '上一个任务仍在进行，请稍候');
  const packages = normalizePackages([req.params.name]);
  const started = startJob('uninstall', packages, req.user, async () => {
    const data = await callEnvBuilder('/uninstall', { packages });
    await refreshSandboxInfo();
    return data.log || `已卸载：${packages.join(' ')}`;
  });
  res.json({ job: publicJob(started) });
});

module.exports = router;
