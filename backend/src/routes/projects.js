const express = require('express');
const { body } = require('express-validator');
const db = require('../db');
const config = require('../config');
const HttpError = require('../utils/HttpError');
const { requireAuth } = require('../middleware/auth');
const { validate, PROJECT_NAME_RE } = require('../middleware/validation');
const fileStore = require('../services/fileStore');
const { assertQuota } = require('../services/quota');
const { classifyFileName, isTextKind } = require('../utils/fileKind');
const { sniffMime, sniffMatchesExt } = require('../utils/sniff');
const { normalizeFileName } = require('../utils/language');

const router = express.Router();
router.use(requireAuth);

const MAX_FILE_CONTENT = 200000; // 文本 200KB
const NAME_SHAPE_RE = /^[A-Za-z0-9_-]{1,100}\.[A-Za-z0-9]+$/;

function toProjectId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(404, '项目不存在');
  return id;
}

function toFileId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(404, '文件不存在');
  return id;
}

function getOwnedProject(userId, projectId) {
  const project = db
    .prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
    .get(projectId, userId);
  if (!project) throw new HttpError(404, '项目不存在');
  return project;
}

function getOwnedFile(userId, projectId, fileId) {
  const file = db
    .prepare(
      `SELECT f.* FROM files f
       JOIN projects p ON p.id = f.project_id
       WHERE f.id = ? AND f.project_id = ? AND p.user_id = ?`,
    )
    .get(fileId, projectId, userId);
  if (!file) throw new HttpError(404, '文件不存在');
  return file;
}

function touchProject(projectId) {
  db.prepare('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(projectId);
}

// 统一的文件响应结构：文本含 content，媒体含 kind/mime_type/size_bytes
function toFilePublic(userId, project, row, includeContent = true) {
  const c = classifyFileName(row.name);
  const isText = c && c.kind === 'text';
  return {
    id: row.id,
    name: row.name,
    kind: isText ? 'text' : (c ? c.kind : 'unknown'),
    language: isText ? c.language : null,
    mime_type: row.mime_type || (c ? c.mime_type : null),
    size_bytes: fileStore.fileSize(userId, project.id, row.name),
    content: includeContent && isText ? fileStore.readFile(userId, project.id, row.name) : null,
  };
}

// GET /api/projects -> { projects: [{id, name, created_at, environment_id}] }
router.get('/', (req, res) => {
  const projects = db
    .prepare('SELECT id, name, created_at, environment_id FROM projects WHERE user_id = ? ORDER BY created_at DESC, id DESC')
    .all(req.user.id);
  res.json({ projects });
});

// PUT /api/projects/:id/environment  { environment_id } -> { project }（绑定/解绑 Python 环境）
router.put('/:id/environment', (req, res) => {
  const projectId = toProjectId(req.params.id);
  const project = getOwnedProject(req.user.id, projectId);
  const raw = req.body?.environment_id;

  let environmentId = null;
  if (raw !== null && raw !== undefined && raw !== '') {
    environmentId = Number(raw);
    if (!Number.isInteger(environmentId) || environmentId <= 0) {
      throw new HttpError(400, 'environment_id 不合法');
    }
    const env = db
      .prepare('SELECT id FROM environments WHERE id = ? AND user_id = ?')
      .get(environmentId, req.user.id);
    if (!env) throw new HttpError(404, '环境不存在');
  }

  db.prepare('UPDATE projects SET environment_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
    environmentId,
    project.id,
  );
  res.json({ project: { id: project.id, environment_id: environmentId } });
});

// POST /api/projects  { name } -> { project }
router.post(
  '/',
  validate([
    body('name')
      .trim()
      .matches(PROJECT_NAME_RE)
      .withMessage('项目名需为 1-50 位字符，且不能包含 / \\ 等特殊字符'),
  ]),
  (req, res) => {
    const name = String(req.body?.name ?? '').trim();
    if (!name || !PROJECT_NAME_RE.test(name)) {
      throw new HttpError(400, '项目名需为 1-50 位字符，且不能包含 / \\ 等特殊字符');
    }
    const info = db.prepare('INSERT INTO projects (user_id, name) VALUES (?, ?)').run(req.user.id, name);
    const project = db
      .prepare('SELECT id, name, created_at, environment_id FROM projects WHERE id = ?')
      .get(info.lastInsertRowid);
    fileStore.ensureProjectDir(req.user.id, project.id);
    res.status(201).json({ project });
  },
);

// DELETE /api/projects/:id -> { success }（级联删除数据库中的文件行 + 磁盘目录）
router.delete('/:id', (req, res) => {
  const projectId = toProjectId(req.params.id);
  const project = getOwnedProject(req.user.id, projectId);
  db.prepare('DELETE FROM projects WHERE id = ?').run(project.id); // files 由 FK ON DELETE CASCADE 级联
  fileStore.deleteProjectDir(req.user.id, project.id);
  res.json({ success: true });
});

// GET /api/projects/:id/files -> { files: [...] }（文本含 content，媒体含 kind/mime/size）
router.get('/:id/files', (req, res) => {
  const projectId = toProjectId(req.params.id);
  const project = getOwnedProject(req.user.id, projectId);
  const rows = db
    .prepare('SELECT id, name, language, mime_type FROM files WHERE project_id = ? ORDER BY created_at ASC, id ASC')
    .all(project.id);
  const files = rows.map((f) => toFilePublic(req.user.id, project, f));
  res.json({ files });
});

// POST /api/projects/:id/files  { name, content } -> { file }（文本文件）
router.post(
  '/:id/files',
  validate([
    body('name').trim().matches(NAME_SHAPE_RE).withMessage('文件名不合法（如 main.cpp / note.txt）'),
    body('content').optional().isString().withMessage('content 必须是字符串'),
  ]),
  (req, res) => {
    const projectId = toProjectId(req.params.id);
    const project = getOwnedProject(req.user.id, projectId);
    const name = normalizeFileName(req.body?.name);
    const content = String(req.body?.content ?? '');

    const c = classifyFileName(name);
    if (!c || c.kind !== 'text') {
      throw new HttpError(400, '文本文件仅支持 .cpp / .py / .c / .txt；媒体文件请用「上传文件」');
    }
    if (content.length > MAX_FILE_CONTENT) {
      throw new HttpError(413, `文件内容过大（最大 ${MAX_FILE_CONTENT / 1000}KB）`);
    }

    assertQuota(req.user.id, Buffer.byteLength(content)); // 配额校验

    const rel = fileStore.relFilePath(req.user.id, project.id, name);
    fileStore.writeFile(req.user.id, project.id, name, content);
    let info;
    try {
      info = db
        .prepare(
          'INSERT INTO files (project_id, name, file_path, language, mime_type) VALUES (?, ?, ?, ?, ?)',
        )
        .run(project.id, name, rel, c.language, c.mime_type);
    } catch (err) {
      fileStore.deleteFileOnDisk(req.user.id, project.id, name);
      throw err;
    }
    const row = db.prepare('SELECT id, name, language, mime_type FROM files WHERE id = ?').get(info.lastInsertRowid);
    touchProject(project.id);
    res.status(201).json({ file: toFilePublic(req.user.id, project, row) });
  },
);

// POST /api/projects/:id/upload  { name, data } -> { file }（二进制媒体上传）
router.post('/:id/upload', (req, res) => {
  const projectId = toProjectId(req.params.id);
  const project = getOwnedProject(req.user.id, projectId);
  const name = normalizeFileName(req.body?.name);

  const c = classifyFileName(name);
  if (!c) {
    throw new HttpError(400, '仅支持图片（png/jpg/gif/webp）、音频（mp3/wav/m4a/ogg）、视频（mp4/webm/mov）');
  }
  if (c.kind === 'text') {
    throw new HttpError(400, '文本文件请使用「创建文件」');
  }

  const dataUrl = String(req.body?.data ?? '');
  const match = /^data:([\w.+-]+\/[\w.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl.trim());
  if (!match) throw new HttpError(400, '上传数据不合法');

  const buf = Buffer.from(match[2], 'base64');
  if (buf.length === 0) throw new HttpError(400, '文件内容为空');
  if (buf.length > config.MAX_UPLOAD_BYTES) {
    throw new HttpError(413, `文件大小需在 ${Math.round(config.MAX_UPLOAD_BYTES / 1048576)}MB 以内`);
  }

  // 魔数嗅探：真实类型必须与扩展名匹配
  const sniffed = sniffMime(buf);
  if (!sniffed || !sniffMatchesExt(sniffed, c.ext)) {
    throw new HttpError(400, '文件内容与扩展名不符，已拒绝');
  }

  assertQuota(req.user.id, buf.length); // 配额校验

  const rel = fileStore.relFilePath(req.user.id, project.id, name);
  fileStore.writeFileRaw(req.user.id, project.id, name, buf);
  let info;
  try {
    info = db
      .prepare(
        'INSERT INTO files (project_id, name, file_path, language, mime_type, storage_path) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(project.id, name, rel, c.language, c.mime_type, rel);
  } catch (err) {
    fileStore.deleteFileOnDisk(req.user.id, project.id, name);
    throw err;
  }
  const row = db.prepare('SELECT id, name, language, mime_type FROM files WHERE id = ?').get(info.lastInsertRowid);
  touchProject(project.id);
  res.status(201).json({ file: toFilePublic(req.user.id, project, row, false) });
});

// GET /api/projects/:id/files/:fileId/media -> 原始字节流（图片/音视频预览，需鉴权）
router.get('/:id/files/:fileId/media', (req, res) => {
  const projectId = toProjectId(req.params.id);
  const fileId = toFileId(req.params.fileId);
  const project = getOwnedProject(req.user.id, projectId);
  const file = getOwnedFile(req.user.id, project.id, fileId);

  const c = classifyFileName(file.name);
  if (!c || c.kind === 'text') {
    throw new HttpError(400, '该文件不支持流式预览');
  }
  const buf = fileStore.readFileRaw(req.user.id, project.id, file.name);
  if (!buf) throw new HttpError(404, '文件内容缺失');

  res.set('Content-Type', c.mime_type);
  res.set('Content-Length', String(buf.length));
  res.set('Cache-Control', 'private, max-age=3600');
  res.send(buf);
});

// PUT /api/projects/:id/files/:fileId  { content } -> { file }（自动保存，仅文本）
router.put('/:id/files/:fileId', (req, res) => {
  const projectId = toProjectId(req.params.id);
  const fileId = toFileId(req.params.fileId);
  const project = getOwnedProject(req.user.id, projectId);
  const file = getOwnedFile(req.user.id, project.id, fileId);

  const c = classifyFileName(file.name);
  if (!c || c.kind !== 'text') {
    throw new HttpError(400, '媒体文件不支持编辑保存');
  }

  const content = String(req.body?.content ?? '');
  if (content.length > MAX_FILE_CONTENT) {
    throw new HttpError(413, `文件内容过大（最大 ${MAX_FILE_CONTENT / 1000}KB）`);
  }

  // 配额校验：只计算增量（缩小文件不占用新空间）
  const delta = Buffer.byteLength(content) - fileStore.fileSize(req.user.id, project.id, file.name);
  if (delta > 0) assertQuota(req.user.id, delta);

  fileStore.writeFile(req.user.id, project.id, file.name, content);
  db.prepare('UPDATE files SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(file.id);
  touchProject(project.id);
  res.json({ file: { id: file.id, name: file.name, content, language: file.language } });
});

// PATCH /api/projects/:id/files/:fileId  { name } -> { file }（重命名，重算类型）
router.patch('/:id/files/:fileId', (req, res) => {
  const projectId = toProjectId(req.params.id);
  const fileId = toFileId(req.params.fileId);
  const project = getOwnedProject(req.user.id, projectId);
  const file = getOwnedFile(req.user.id, project.id, fileId);

  const name = normalizeFileName(req.body?.name);
  const c = classifyFileName(name);
  if (!c) {
    throw new HttpError(400, '不支持该扩展名（文本/图片/音频/视频）');
  }

  if (name === file.name) {
    return res.json({ file: toFilePublic(req.user.id, project, file) });
  }

  fileStore.renameFileOnDisk(req.user.id, project.id, file.name, name);
  const rel = fileStore.relFilePath(req.user.id, project.id, name);
  try {
    db.prepare(
      'UPDATE files SET name = ?, file_path = ?, language = ?, mime_type = ?, storage_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    ).run(name, rel, c.language, c.mime_type, c.kind === 'text' ? null : rel, file.id);
  } catch (err) {
    try {
      fileStore.renameFileOnDisk(req.user.id, project.id, name, file.name);
    } catch { /* 忽略回滚失败 */ }
    throw err;
  }
  touchProject(project.id);
  const row = db.prepare('SELECT id, name, language, mime_type FROM files WHERE id = ?').get(file.id);
  res.json({ file: toFilePublic(req.user.id, project, row) });
});

// DELETE /api/projects/:id/files/:fileId -> { success }
router.delete('/:id/files/:fileId', (req, res) => {
  const projectId = toProjectId(req.params.id);
  const fileId = toFileId(req.params.fileId);
  const project = getOwnedProject(req.user.id, projectId);
  const file = getOwnedFile(req.user.id, project.id, fileId);

  db.prepare('DELETE FROM files WHERE id = ?').run(file.id);
  fileStore.deleteFileOnDisk(req.user.id, project.id, file.name);
  touchProject(project.id);
  res.json({ success: true });
});

module.exports = router;
