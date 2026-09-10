// 限流器：基于 IP / user_id（express-rate-limit）
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const make = (options) =>
  rateLimit({
    standardHeaders: 'draft-7', // RateLimit-* 响应头
    legacyHeaders: false,
    message: { error: '请求过于频繁，请稍后再试' },
    ...options,
  });

// 全局兜底：每 IP 每分钟 120 次
const globalLimiter = make({ windowMs: 60 * 1000, limit: 120 });

// 登录/注册防爆破：每 IP 每分钟 20 次（需求 1.6）
const authLimiter = make({ windowMs: 60 * 1000, limit: 20 });

// 代码执行：每用户每分钟 10 次（需求 1.6）
// 优先按 user_id 计；无 token 时回退到 IPv6 安全的 IP 键
const executeLimiter = make({
  windowMs: 60 * 1000,
  limit: 10,
  keyGenerator: (req) =>
    req.user?.id ? `user:${req.user.id}` : ipKeyGenerator(req.ip),
});

// 交互终端会话创建：每用户每分钟 12 次
// 每次创建都会拉起 PTY + Xvfb + x11vnc，属于重资源操作，必须单独限制
const terminalLimiter = make({
  windowMs: 60 * 1000,
  limit: 12,
  message: { error: '终端启动过于频繁，请稍后再试' },
  keyGenerator: (req) =>
    req.user?.id ? `term:${req.user.id}` : `term:${ipKeyGenerator(req.ip)}`,
});

module.exports = { globalLimiter, authLimiter, executeLimiter, terminalLimiter };
