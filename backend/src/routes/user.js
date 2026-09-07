const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const db = require('../db');
const config = require('../config');
const HttpError = require('../utils/HttpError');
const { isAdminUser } = require('../middleware/auth');
const { validate, PASSWORD_RE, PASSWORD_MSG } = require('../middleware/validation');
const { logger, maskEmail } = require('../utils/logger');

const router = express.Router();

// ── 编辑器背景 ──────────────────────────────────────────
const MIME_EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
const MAX_IMAGE_BYTES = 2.5 * 1024 * 1024; // 2.5MB
const DEFAULT_BG_SETTINGS = { scale: 100, contrast: 100, opacity: 18, posX: 50, posY: 30 };

// 魔数嗅探：校验文件真实类型（不信任声明的 MIME）
function sniffMime(buf) {
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (buf.length > 6 && (buf.toString('ascii', 0, 6) === 'GIF87a' || buf.toString('ascii', 0, 6) === 'GIF89a')) return 'image/gif';
  return null;
}

function bgPath(userId) {
  const base = path.join(config.STORAGE_DIR, 'users', String(userId), 'editor-background');
  return path.resolve(base); // 规范化
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
router.put(
  '/profile',
  validate([
    body('nickname').optional().isString().trim().isLength({ max: 24 }).withMessage('昵称最长 24 个字符'),
    body('avatar').optional().isString().trim().isLength({ max: 8 }).withMessage('头像不合法'),
  ]),
  (req, res) => {
    const nickname = typeof req.body?.nickname === 'string' ? req.body.nickname.trim() : '';
    const avatar = typeof req.body?.avatar === 'string' ? req.body.avatar.trim() : '';

    db.prepare('UPDATE users SET nickname = ?, avatar = ? WHERE id = ?').run(
      nickname || null,
      avatar || null,
      req.user.id,
    );

    const row = db
      .prepare('SELECT id, email, nickname, avatar, role, status, created_at FROM users WHERE id = ?')
      .get(req.user.id);
    res.json({ user: toUser(row) });
  },
);

// PUT /api/user/password  { currentPassword, newPassword } -> { success }
// 需验证当前密码；新密码强制复杂度（≥8 位，大小写+数字）。
// 硬编码管理员的密码由服务器 .env 的 ADMIN_PASSWORD 控制，不在此修改。
router.put(
  '/password',
  validate([
    body('currentPassword').isString().notEmpty().withMessage('请输入当前密码'),
    body('newPassword').isString().matches(PASSWORD_RE).withMessage(PASSWORD_MSG),
  ]),
  (req, res) => {
    const current = req.body.currentPassword;
    const next = req.body.newPassword;

    if (isAdminUser(req.user)) {
      throw new HttpError(400, '管理员密码由服务器 .env 的 ADMIN_PASSWORD 控制，修改配置后重启即可生效');
    }

    const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    if (!row || !bcrypt.compareSync(current, row.password_hash)) {
      throw new HttpError(400, '当前密码不正确');
    }

    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
      bcrypt.hashSync(next, 10),
      req.user.id,
    );
    logger.info(`[user] 修改密码成功 ${maskEmail(req.user.email)}`);
    res.json({ success: true });
  },
);

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
// 安全：MIME 白名单 + 魔数嗅探（真实类型必须与声明一致）+ 大小上限
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
  const sniffed = sniffMime(buf);
  if (!sniffed || sniffed !== match[1]) {
    throw new HttpError(400, '图片内容与声明类型不符，已拒绝');
  }

  const dir = path.dirname(bgPath(req.user.id));
  fs.mkdirSync(dir, { recursive: true });
  const ext = MIME_EXT[match[1]];
  for (const oldExt of Object.values(MIME_EXT)) {
    const old = `${bgPath(req.user.id)}.${oldExt}`;
    if (oldExt !== ext && fs.existsSync(old)) fs.unlinkSync(old);
  }
  // 每用户单文件槽位（路径私有、扩展名白名单、内容魔数校验）
  fs.writeFileSync(`${bgPath(req.user.id)}.${ext}`, buf);

  res.json({ success: true, settings: readBgSettings(req.user.id) });
});

// PUT /api/user/background/settings  { scale, contrast, opacity, posX, posY } -> { settings }
router.put(
  '/background/settings',
  validate([
    body('scale').optional().isFloat({ min: 20, max: 300 }),
    body('contrast').optional().isFloat({ min: 20, max: 200 }),
    body('opacity').optional().isFloat({ min: 0, max: 100 }),
    body('posX').optional().isFloat({ min: -100, max: 100 }),
    body('posY').optional().isFloat({ min: -100, max: 100 }),
  ]),
  (req, res) => {
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
  },
);

// DELETE /api/user/background -> { success }
router.delete('/background', (req, res) => {
  for (const ext of Object.values(MIME_EXT)) {
    const file = `${bgPath(req.user.id)}.${ext}`;
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  res.json({ success: true });
});

module.exports = router;
