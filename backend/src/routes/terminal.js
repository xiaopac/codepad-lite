// 交互式终端（隐藏页 /web，仅管理员）：会话创建
// WebSocket 流式代理见 terminalWs.js（由 server.js 挂载）
const express = require('express');
const { body } = require('express-validator');
const config = require('../config');
const HttpError = require('../utils/HttpError');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { logger, maskEmail } = require('../utils/logger');

const router = express.Router();
router.use(requireAuth);

// POST /api/terminal/sessions  { language: 'python'|'cpp', code } -> { session_id }
// 登记代码到 term-runner；真正的 PTY 进程在 WebSocket 连接时才启动
router.post(
  '/sessions',
  requireAdmin, // 隐藏页仅管理员可用（前端也有守卫，此处是硬闸门）
  validate([
    body('language').isIn(['python', 'cpp']).withMessage('仅支持 python / cpp'),
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
    logger.info(`[term] ${maskEmail(req.user.email)} 创建终端会话（${language}，${code.length}B）`);
    res.json(data);
  },
);

module.exports = router;
