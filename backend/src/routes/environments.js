// 用户自定义 Python 环境：增删查 + 构建/重建
const express = require('express');
const { body } = require('express-validator');
const db = require('../db');
const HttpError = require('../utils/HttpError');
const { requireAuth } = require('../middleware/auth');
const { validate, PKG_RE, sanitizeBuildCommand } = require('../middleware/validation');
const { logger, maskEmail } = require('../utils/logger');
const { buildEnvironment, packagesOf, VERSION_MAP } = require('../services/envBuilder');

const router = express.Router();
router.use(requireAuth);

const NAME_RE = /^[A-Za-z0-9_\u4e00-\u9fa5 .-]{1,30}$/;
const ALLOWED_VERSIONS = Object.keys(VERSION_MAP);

function toEnv(row) {
  return {
    id: row.id,
    name: row.name,
    python_version: row.python_version,
    packages: packagesOf(row),
    status: row.status,
    error: row.error,
    build_log: row.build_log ?? null,
    build_command_custom: row.build_command_custom ?? '',
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

// 解析并规范化提交的字段（name / packages / build_command），返回 { ok, data } 或 { ok:false, error }
function parseEnvPayload(req) {
  const name = String(req.body?.name ?? '').trim();
  if (!NAME_RE.test(name)) throw new HttpError(400, '环境名需为 1-30 位字符');
  const packages = Array.isArray(req.body?.packages)
    ? req.body.packages.map((p) => String(p).trim().toLowerCase()).filter(Boolean)
    : [];
  if (packages.length > 50) throw new HttpError(400, '最多 50 个库');
  for (const p of packages) {
    if (!PKG_RE.test(p)) throw new HttpError(400, `库名不合法：${p}`);
  }
  // 高级模式：自定义 pip 参数（白名单校验，防系统命令注入）
  const custom = sanitizeBuildCommand(String(req.body?.build_command ?? ''));
  if (!custom.ok) throw new HttpError(400, custom.error);
  return { name, packages, buildCommand: custom.tokens.join(' ') };
}

// GET /api/environments -> { environments: [...] }
router.get('/', (req, res) => {
  ensureDefaultEnv(req.user.id);
  const rows = db
    .prepare('SELECT * FROM environments WHERE user_id = ? ORDER BY id ASC')
    .all(req.user.id);
  res.json({ environments: rows.map(toEnv) });
});

// POST /api/environments  { name, python_version, packages: string[], build_command? }
router.post(
  '/',
  validate([
    body('name').trim().matches(NAME_RE).withMessage('环境名需为 1-30 位字符'),
    body('python_version').isIn(ALLOWED_VERSIONS).withMessage('仅支持 3.9 / 3.10 / 3.11'),
    body('packages').optional().isArray().withMessage('packages 必须是数组'),
    body('packages.*').optional().matches(PKG_RE).withMessage('库名不合法（字母数字开头，可含 . _ -）'),
    body('build_command').optional().isString().withMessage('build_command 必须是字符串'),
  ]),
  (req, res) => {
    const pythonVersion = String(req.body?.python_version ?? '').trim();
    const { name, packages, buildCommand } = parseEnvPayload(req);

    const info = db
      .prepare(
        "INSERT INTO environments (user_id, name, python_version, packages, build_command_custom, status) VALUES (?, ?, ?, ?, ?, 'building')",
      )
      .run(req.user.id, name, pythonVersion, JSON.stringify(packages), buildCommand);

    const row = db.prepare('SELECT * FROM environments WHERE id = ?').get(info.lastInsertRowid);
    buildEnvironment(row.id).catch(() => {}); // 异步构建
    logger.info(
      `[env] ${maskEmail(req.user.email)} 创建环境「${name}」（Python ${pythonVersion}，${packages.length} 个库` +
        (buildCommand ? `，自定义参数：${buildCommand}` : '') + '）',
    );
    res.status(201).json({ environment: toEnv(row) });
  },
);

// PUT /api/environments/:id  { name, packages?, build_command? } —— 保存后自动重建
router.put(
  '/:id',
  validate([
    body('name').trim().matches(NAME_RE).withMessage('环境名需为 1-30 位字符'),
    body('packages').optional().isArray().withMessage('packages 必须是数组'),
    body('packages.*').optional().matches(PKG_RE).withMessage('库名不合法（字母数字开头，可含 . _ -）'),
    body('build_command').optional().isString().withMessage('build_command 必须是字符串'),
  ]),
  (req, res) => {
    const id = Number(req.params.id);
    const row = db.prepare('SELECT * FROM environments WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!row) throw new HttpError(404, '环境不存在');
    if (row.status === 'building') throw new HttpError(400, '环境正在构建中，请稍后再编辑');

    const { name, packages, buildCommand } = parseEnvPayload(req);

    db.prepare(
      'UPDATE environments SET name = ?, packages = ?, build_command_custom = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    ).run(name, JSON.stringify(packages), buildCommand, id);

    const updated = db.prepare('SELECT * FROM environments WHERE id = ?').get(id);
    buildEnvironment(id).catch(() => {}); // 保存后自动重建
    logger.info(`[env] ${maskEmail(req.user.email)} 更新环境「${name}」并重建`);
    res.json({ environment: { ...toEnv(updated), status: 'building', error: null } });
  },
);

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
