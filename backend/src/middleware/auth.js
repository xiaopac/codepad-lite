const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');

function isAdminUser(user) {
  return user && (user.role === 'admin' || user.email === config.ADMIN_USERNAME);
}

// JWT 无状态认证：Authorization: Bearer <token>
// 每次请求都从数据库读取最新用户信息，因此审核状态/角色变更即时生效。
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) {
    return res.status(401).json({ error: '未登录或登录已过期' });
  }
  let payload;
  try {
    payload = jwt.verify(token, config.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: '未登录或登录已过期' });
  }
  const user = db
    .prepare('SELECT id, email, nickname, avatar, role, status, created_at FROM users WHERE id = ?')
    .get(payload.id);
  if (!user) {
    return res.status(401).json({ error: '用户不存在' });
  }
  // 三态闸门：非激活账号（含被拒绝、被降级）一律拒绝访问；管理员豁免
  if (user.status !== 'active' && !isAdminUser(user)) {
    return res.status(401).json({ error: '账号未激活，请联系管理员' });
  }
  req.user = user;
  next();
}

// 管理员权限校验（需配合 requireAuth 使用）
function requireAdmin(req, res, next) {
  if (!isAdminUser(req.user)) {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, isAdminUser };
