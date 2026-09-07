// 用户自定义 Python 环境：增删查 + 构建/重建
const express = require('express');
const db = require('../db');
const HttpError = require('../utils/HttpError');
const { requireAuth } = require('../middleware/auth');
const { buildEnvironment, packagesOf, VERSION_MAP } = require('../services/envBuilder');

const router = express.Router();
router.use(requireAuth);

const NAME_RE = /^[A-Za-z0-9_\u4e00-\u9fa5 .-]{1,30}$/;
const PKG_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const ALLOWED_VERSIONS = Object.keys(VERSION_MAP);

function toEnv(row) {
  return {
    id: row.id,
    name: row.name,
    python_version: row.python_version,
    packages: packagesOf(row),
    status: row.status,
    error: row.error,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// 默认环境：首次访问时自动创建（Python 3.10、无额外包）
function ensureDefaultEnv(userId) {
  const count = db.prepare('SELECT COUNT(*) c FROM environments WHERE user_id = ?').get(userId).c;
  if (count === 0) {
    db.prepare(
      "INSERT INTO environments (user_id, name, python_version, packages, status) VALUES (?, '默认环境', '3.10', '[]', 'ready')",
    ).run(userId);
  }
}

// GET /api/environments -> { environments: [...] }
router.get('/', (req, res) => {
  ensureDefaultEnv(req.user.id);
  const rows = db
    .prepare('SELECT * FROM environments WHERE user_id = ? ORDER BY id ASC')
    .all(req.user.id);
  res.json({ environments: rows.map(toEnv) });
});

// POST /api/environments  { name, python_version, packages: string[] }
router.post('/', (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  const pythonVersion = String(req.body?.python_version ?? '').trim();
  const packages = Array.isArray(req.body?.packages)
    ? req.body.packages.map((p) => String(p).trim().toLowerCase()).filter(Boolean)
    : [];

  if (!NAME_RE.test(name)) throw new HttpError(400, '环境名需为 1-30 位字符');
  if (!ALLOWED_VERSIONS.includes(pythonVersion)) throw new HttpError(400, '仅支持 3.9 / 3.10 / 3.11');
  if (packages.length > 50) throw new HttpError(400, '最多 50 个库');
  for (const p of packages) {
    if (!PKG_RE.test(p)) throw new HttpError(400, `库名不合法：${p}`);
  }

  const info = db
    .prepare(
      "INSERT INTO environments (user_id, name, python_version, packages, status) VALUES (?, ?, ?, ?, 'building')",
    )
    .run(req.user.id, name, pythonVersion, JSON.stringify(packages));

  const row = db.prepare('SELECT * FROM environments WHERE id = ?').get(info.lastInsertRowid);
  buildEnvironment(row.id).catch(() => {}); // 异步构建
  res.status(201).json({ environment: toEnv(row) });
});

// POST /api/environments/:id/rebuild -> { environment }
router.post('/:id/rebuild', (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM environments WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!row) throw new HttpError(404, '环境不存在');
  buildEnvironment(id).catch(() => {});
  res.json({ environment: { ...toEnv(row), status: 'building', error: null } });
});

// DELETE /api/environments/:id -> { success }
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM environments WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!row) throw new HttpError(404, '环境不存在');

  const count = db.prepare('SELECT COUNT(*) c FROM environments WHERE user_id = ?').get(req.user.id).c;
  if (count <= 1) throw new HttpError(400, '至少保留一个环境');

  db.prepare('DELETE FROM environments WHERE id = ?').run(id);
  db.prepare('UPDATE projects SET environment_id = NULL WHERE environment_id = ?').run(id);
  res.json({ success: true });
});

module.exports = router;
