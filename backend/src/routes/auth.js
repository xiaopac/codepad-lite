const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const db = require('../db');
const config = require('../config');
const HttpError = require('../utils/HttpError');
const { lookupLocation } = require('../services/geo');
const { isAdminUser } = require('../middleware/auth');
const { validate, PASSWORD_RE, PASSWORD_MSG } = require('../middleware/validation');
const { authLimiter } = require('../utils/rateLimiter');
const { logger, maskEmail } = require('../utils/logger');

const router = express.Router();

// 防爆破：登录/注册每 IP 每分钟 20 次（需求 1.6）
router.use(authLimiter);

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

function toPublicUser(u) {
  return {
    id: u.id,
    email: u.email,
    nickname: u.nickname ?? null,
    avatar: u.avatar ?? null,
    role: isAdminUser(u) ? 'admin' : (u.role || 'user'),
    status: u.status,
    created_at: u.created_at,
  };
}

// POST /api/auth/register  { email, password }
// -> { success, user }；新注册账号一律进入 pending（待管理员审核）
// 注册时自动采集数字指纹：IP / 归属地 / User-Agent
router.post(
  '/register',
  validate([
    body('email')
      .trim()
      .matches(EMAIL_RE)
      .withMessage('请输入合法的邮箱地址')
      .toLowerCase(),
    body('password').isString().matches(PASSWORD_RE).withMessage(PASSWORD_MSG),
  ]),
  async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    if (email === config.ADMIN_USERNAME) {
      throw new HttpError(409, '该账号名不可注册');
    }

    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (exists) {
      throw new HttpError(409, '该邮箱已被注册');
    }

    // ── 数字指纹采集 ──
    const ip = String(req.ip || '').slice(0, 64) || null;
    const location = await lookupLocation(ip); // 尽力而为，失败为 null，不阻塞注册
    const userAgent = String(req.headers['user-agent'] || '').slice(0,500) || null;

    const passwordHash = bcrypt.hashSync(password, 10); // cost factor 10（需求 1.2）
    const info = db
      .prepare(
        `INSERT INTO users (email, password_hash, role, status, ip_address, location, user_agent)
         VALUES (?, ?, 'user', 'pending', ?, ?, ?)`,
      )
      .run(email, passwordHash, ip, location, userAgent);
    const user = db
      .prepare('SELECT id, email, nickname, avatar, role, status, created_at FROM users WHERE id = ?')
      .get(info.lastInsertRowid);

    logger.info(`[auth] 注册成功 ${maskEmail(email)}（IP ${ip || '-'}，待审核）`);
    res.status(201).json({ success: true, user: toPublicUser(user) });
  },
);

// POST /api/auth/login  { email, password } -> { token, user }
// 三态闸门：pending → 403 审核中；rejected → 403 已拒绝；active → 放行。
router.post(
  '/login',
  validate([
    body('email').trim().notEmpty().withMessage('请输入邮箱或管理员账号').toLowerCase(),
    body('password').isString().notEmpty().withMessage('请输入密码'),
  ]),
  (req, res) => {
    const identifier = req.body.email;
    const password = req.body.password;

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(identifier);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      logger.warn(`[auth] 登录失败 ${maskEmail(identifier)}（IP ${req.ip || '-'}）`);
      throw new HttpError(401, '邮箱或密码错误');
    }

    // 管理员自愈：xiaopac 永远是 admin + active
    if (isAdminUser(user)) {
      db.prepare("UPDATE users SET role = 'admin', status = 'active' WHERE id = ?").run(user.id);
      user.role = 'admin';
      user.status = 'active';
    }

    // 三态闸门
    if (user.status === 'pending') {
      throw new HttpError(403, '账号正在审核中，请等待管理员通过后重试');
    }
    if (user.status === 'rejected') {
      throw new HttpError(403, '账号已被拒绝，如有疑问请联系管理员');
    }
    if (user.status !== 'active') {
      throw new HttpError(403, '账号状态异常，请联系管理员');
    }

    // JWT：HS256 + 7 天有效期；登录成功即签发新 token，不与客户端缓存绑定
    const token = jwt.sign(
      { id: user.id, role: user.role },
      config.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: config.JWT_EXPIRES_IN },
    );

    logger.info(`[auth] 登录成功 ${maskEmail(user.email)}（IP ${req.ip || '-'}）`);
    res.json({ token, user: toPublicUser(user) });
  },
);

module.exports = router;
