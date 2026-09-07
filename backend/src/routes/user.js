const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const HttpError = require('../utils/HttpError');
const { isAdminUser } = require('../middleware/auth');

const router = express.Router();

function toUser(row) {
  return {
    id: row.id,
    email: row.email,
    nickname: row.nickname ?? null,
    avatar: row.avatar ?? null,
    role: isAdminUser(row) ? 'admin' : (row.role || 'user'),
    status: row.status,
    created_at: row.created_at,
  };
}

// GET /api/user/me（requireAuth 在 app.js 挂载时统一应用）
router.get('/me', (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/user/profile  { nickname, avatar } -> { user }
router.put('/profile', (req, res) => {
  const nickname = String(req.body?.nickname ?? '').trim();
  const avatar = String(req.body?.avatar ?? '').trim();

  if (nickname.length > 24) throw new HttpError(400, '昵称最长 24 个字符');
  if (avatar.length > 8) throw new HttpError(400, '头像不合法');

  db.prepare('UPDATE users SET nickname = ?, avatar = ? WHERE id = ?').run(
    nickname || null,
    avatar || null,
    req.user.id,
  );

  const row = db
    .prepare('SELECT id, email, nickname, avatar, role, status, created_at FROM users WHERE id = ?')
    .get(req.user.id);
  res.json({ user: toUser(row) });
});

// PUT /api/user/password  { currentPassword, newPassword } -> { success }
// 需验证当前密码；硬编码管理员的密码由服务器 .env 的 ADMIN_PASSWORD 控制，不在此修改
router.put('/password', (req, res) => {
  const current = String(req.body?.currentPassword ?? '');
  const next = String(req.body?.newPassword ?? '');

  if (isAdminUser(req.user)) {
    throw new HttpError(400, '管理员密码由服务器 .env 的 ADMIN_PASSWORD 控制，修改配置后重启即可生效');
  }
  if (next.length < 6 || next.length > 72) {
    throw new HttpError(400, '新密码长度需为 6-72 位');
  }

  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!row || !bcrypt.compareSync(current, row.password_hash)) {
    throw new HttpError(400, '当前密码不正确');
  }

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
    bcrypt.hashSync(next, 10),
    req.user.id,
  );
  res.json({ success: true });
});

module.exports = router;
