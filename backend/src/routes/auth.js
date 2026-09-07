const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');
const HttpError = require('../utils/HttpError');
const { lookupLocation } = require('../services/geo');
const { isAdminUser } = require('../middleware/auth');

const router = express.Router();

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

function toPublicUser(u) {
  return {
    id: u.id,
    email: u.email,
    role: isAdminUser(u) ? 'admin' : (u.role || 'user'),
    status: u.status,
    created_at: u.created_at,
  };
}

// POST /api/auth/register  { email, password }
// -> { success, user }；新注册账号一律进入 pending（待管理员审核）
// 注册时自动采集数字指纹：IP / 归属地 / User-Agent
router.post('/register', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  if (!EMAIL_RE.test(email)) {
    throw new HttpError(400, '请输入合法的邮箱地址');
  }
  if (email === config.ADMIN_USERNAME) {
    throw new HttpError(409, '该账号名不可注册');
  }
  if (password.length < 6 || password.length > 72) {
    throw new HttpError(400, '密码长度需为 6-72 位');
  }

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) {
    throw new HttpError(409, '该邮箱已被注册');
  }

  // ── 数字指纹采集 ──
  const ip = String(req.ip || '').slice(0, 64) || null;
  const location = await lookupLocation(ip); // 尽力而为，失败为 null，不阻塞注册
  const userAgent = String(req.headers['user-agent'] || '').slice(0, 500) || null;

  const passwordHash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare(
      `INSERT INTO users (email, password_hash, role, status, ip_address, location, user_agent)
       VALUES (?, ?, 'user', 'pending', ?, ?, ?)`,
    )
    .run(email, passwordHash, ip, location, userAgent);
  const user = db
    .prepare('SELECT id, email, role, status, created_at FROM users WHERE id = ?')
    .get(info.lastInsertRowid);

  res.status(201).json({ success: true, user: toPublicUser(user) });
});

// POST /api/auth/login  { email, password } -> { token, user }
// 三态闸门：pending → 403 审核中；rejected → 403 已拒绝；active → 放行。
// 硬编码管理员 xiaopac 直接以账号名登录，且始终为已激活管理员。
router.post('/login', (req, res) => {
  const identifier = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(identifier);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
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

  const token = jwt.sign(
    { id: user.id, role: user.role },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN },
  );

  res.json({ token, user: toPublicUser(user) });
});

module.exports = router;
