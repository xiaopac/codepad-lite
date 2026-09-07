const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../db');
const config = require('../config');
const HttpError = require('../utils/HttpError');
const { isAdminUser } = require('../middleware/auth');

const router = express.Router();

// ── 编辑器背景 ──────────────────────────────────────────
const MIME_EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
const MAX_IMAGE_BYTES = 2.5 * 1024 * 1024; // 2.5MB
const DEFAULT_BG_SETTINGS = { scale: 100, contrast: 100, opacity: 18, posX: 50, posY: 30 };

function bgPath(userId) {
  return path.join(config.STORAGE_DIR, 'users', String(userId), 'editor-background');
}

function readBgSettings(userId) {
  const row = db.prepare('SELECT editor_background FROM users WHERE id = ?').get(userId);
  try {
    const parsed = row?.editor_background ? JSON.parse(row.editor_background) : {};
    return { ...DEFAULT_BG_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_BG_SETTINGS };
  }
}

function saveBgSettings(userId, settings) {
  db.prepare('UPDATE users SET editor_background = ? WHERE id = ?').run(JSON.stringify(settings), userId);
}

// GET /api/user/background -> { image: dataURL|null, settings }
router.get('/background', (req, res) => {
  const settings = readBgSettings(req.user.id);
  let image = null;
  const base = bgPath(req.user.id);
  for (const [mime, ext] of Object.entries(MIME_EXT)) {
    const file = `${base}.${ext}`;
    if (fs.existsSync(file)) {
      const buf = fs.readFileSync(file);
      if (buf.length <= MAX_IMAGE_BYTES * 2) {
        image = `data:${mime};base64,${buf.toString('base64')}`;
      }
      break;
    }
  }
  res.json({ image, settings });
});

// PUT /api/user/background  { image: 'data:image/...;base64,...' } -> { settings }
router.put('/background', (req, res) => {
  const dataUrl = String(req.body?.image ?? '');
  const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl.trim());
  if (!match) {
    throw new HttpError(400, '仅支持 PNG / JPG / WebP / GIF 图片的 base64 数据');
  }
  const buf = Buffer.from(match[2], 'base64');
  if (buf.length === 0 || buf.length > MAX_IMAGE_BYTES) {
    throw new HttpError(413, '图片大小需在 2.5MB 以内');
  }

  const dir = path.dirname(bgPath(req.user.id));
  fs.mkdirSync(dir, { recursive: true });
  const ext = MIME_EXT[match[1]];
  // 清掉旧格式文件，写入新图
  for (const oldExt of Object.values(MIME_EXT)) {
    const old = `${bgPath(req.user.id)}.${oldExt}`;
    if (oldExt !== ext && fs.existsSync(old)) fs.unlinkSync(old);
  }
  fs.writeFileSync(`${bgPath(req.user.id)}.${ext}`, buf);

  res.json({ success: true, settings: readBgSettings(req.user.id) });
});

// PUT /api/user/background/settings  { scale, contrast, opacity, posX, posY } -> { settings }
router.put('/background/settings', (req, res) => {
  const current = readBgSettings(req.user.id);
  const num = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
  const settings = {
    scale: Math.min(300, Math.max(20, num(req.body?.scale, current.scale))),
    contrast: Math.min(200, Math.max(20, num(req.body?.contrast, current.contrast))),
    opacity: Math.min(100, Math.max(0, num(req.body?.opacity, current.opacity))),
    posX: Math.min(100, Math.max(-100, num(req.body?.posX, current.posX))),
    posY: Math.min(100, Math.max(-100, num(req.body?.posY, current.posY))),
  };
  saveBgSettings(req.user.id, settings);
  res.json({ success: true, settings });
});

// DELETE /api/user/background -> { success }
router.delete('/background', (req, res) => {
  for (const ext of Object.values(MIME_EXT)) {
    const file = `${bgPath(req.user.id)}.${ext}`;
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  res.json({ success: true });
});

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
