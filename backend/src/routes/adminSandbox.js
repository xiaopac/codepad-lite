// 管理员后台：终端沙箱第三方库管理（查看 / 安装 / 卸载）
//
// 为什么要绕一圈：沙箱容器（term-runner）只挂 internal 网络、没有外网，装不了库。
// 所以由 env-builder（有外网）把包装进共享卷 /pkgs/sandbox，
// term-runner 通过 PYTHONPATH=/sandbox-pkgs 读取 —— 沙箱依旧是离线的，用户代码也拿不到外网。
// 系统级组件（tkinter 这类 apt 包）pip 装不了，只能改 term-runner 镜像的构建参数后重建。
const express = require('express');
const config = require('../config');
const HttpError = require('../utils/HttpError');
const { logger } = require('../utils/logger');
const { getSandboxEnv, invalidateSandboxEnv } = require('../services/sandboxEnv');

const router = express.Router();

const PKG_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const MAX_PACKAGES = 10;
const JOB_TIMEOUT_MS = 420000; // env-builder 总预算 400s，留出余量

// 最近一次作业（内存态，供管理面板展示进度；安装结果本身落在共享卷里不会丢）
let job = null;

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

function startJob(action, packages, runner) {
  const j = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    action,
    packages,
    status: 'running',
    error: null,
    log: '',
    startedAt: Date.now(),
    finishedAt: null,
  };
  job = j;
  logger.info(`[sandbox] ${action} ${packages.join(' ')} 开始（job ${j.id}）`);
  runner()
    .then((log) => {
      j.status = 'done';
      j.log = log || '';
      logger.info(`[sandbox] ${action} ${packages.join(' ')} 完成（job ${j.id}）`);
    })
    .catch((err) => {
      j.status = 'error';
      j.error = err.message || String(err);
      logger.warn(`[sandbox] ${action} ${packages.join(' ')} 失败：${j.error}`);
    })
    .finally(() => {
      j.finishedAt = Date.now();
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
  res.json({
    env,
    job: publicJob(job),
    // 系统级组件的追加方式（界面据此给出可复制的命令）
    aptExtra: config.APT_EXTRA_PACKAGES || '',
    buildTarget: config.SANDBOX_BUILD_TARGET,
  });
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

  const started = startJob('install', packages, async () => {
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
  const started = startJob('uninstall', packages, async () => {
    const data = await callEnvBuilder('/uninstall', { packages });
    await refreshSandboxInfo();
    return data.log || `已卸载：${packages.join(' ')}`;
  });
  res.json({ job: publicJob(started) });
});

module.exports = router;
