// 交互式终端：会话创建（所有已登录用户可用，每人并发配额）
// WebSocket 流式代理见 terminalWs.js（由 server.js 挂载）
const express = require('express');
const { body } = require('express-validator');
const config = require('../config');
const HttpError = require('../utils/HttpError');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { logger, maskEmail } = require('../utils/logger');
const { terminalLimiter } = require('../utils/rateLimiter');
const { tryAcquire } = require('../terminalSessions');

const router = express.Router();
router.use(requireAuth);

// GET /api/terminal/env -> { python, packages, tools }
// 终端沙箱（term-runner 镜像）里实际可用的 Python 与预装库清单。
// 与前端的「项目 Python 环境」（▶ 运行 使用）是两套，这里给用户一个可见的真实清单。
// 镜像内容是固定的，进程内缓存 10 分钟即可。
let envInfoCache = { at: 0, data: null };
router.get('/env', async (req, res) => {
  const now = Date.now();
  if (envInfoCache.data && now - envInfoCache.at < 10 * 60 * 1000) {
    res.json(envInfoCache.data);
    return;
  }
  let r;
  try {
    r = await fetch(`${config.TERM_RUNNER_URL}/env`, { signal: AbortSignal.timeout(10000) });
  } catch {
    throw new HttpError(503, '终端沙箱服务不可用，请稍后再试');
  }
  if (!r.ok) throw new HttpError(503, '暂时无法读取终端沙箱环境信息');
  const data = await r.json().catch(() => null);
  if (!data || typeof data !== 'object') throw new HttpError(503, '终端沙箱环境信息格式异常');
  envInfoCache = { at: now, data };
  res.json(data);
});

// POST /api/terminal/sessions  { language: 'python'|'cpp'|'c', code } -> { session_id }
// 登记代码到 term-runner；真正的 PTY 进程在 WebSocket 连接时才启动
router.post(
  '/sessions',
  terminalLimiter,
  validate([
    body('language').isIn(['python', 'cpp', 'c']).withMessage('仅支持 python / cpp / c'),
    body('code').isString().withMessage('code 必须是字符串'),
  ]),
  async (req, res) => {
    const { language, code } = req.body ?? {};
    if (typeof code !== 'string' || code.length > 200000) {
      throw new HttpError(413, '代码过长（最大 200KB）');
    }

    let r;
    try {
      r = await fetch(`${config.TERM_RUNNER_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, code }),
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new HttpError(503, '终端沙箱服务不可用，请稍后再试');
    }
    const data = await r.json().catch(() => null);
    if (!r.ok) {
      throw new HttpError(r.status === 429 ? 429 : 502, data?.error || '终端沙箱服务异常');
    }

    // 每用户并发配额（登记即占用，WS 关闭释放，2 分钟未连接自动释放）
    if (!tryAcquire(req.user.id, data.session_id)) {
      throw new HttpError(429, `终端会话已达上限（每人 ${config.TERM_SESSIONS_PER_USER} 个），请先停止其他终端`);
    }
    logger.info(`[term] ${maskEmail(req.user.email)} 创建终端会话（${language}，${code.length}B）`);
    res.json(data);
  },
);

module.exports = router;
