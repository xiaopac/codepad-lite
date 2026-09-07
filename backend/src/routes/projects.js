const express = require('express');
const { body } = require('express-validator');
const db = require('../db');
const HttpError = require('../utils/HttpError');
const { requireAuth } = require('../middleware/auth');
const { validate, PROJECT_NAME_RE, FILE_NAME_RE } = require('../middleware/validation');
const fileStore = require('../services/fileStore');
const {
  languageFromName,
  isValidFileName,
  normalizeFileName,
} = require('../utils/language');

const router = express.Router();
router.use(requireAuth);

const MAX_FILE_CONTENT = 200000; // 200KB

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

// GET /api/projects -> { projects: [{id, name, created_at}] }
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

// GET /api/projects/:id/files -> { files: [{id, name, content, language}] }
router.get('/:id/files', (req, res) => {
  const projectId = toProjectId(req.params.id);
  const project = getOwnedProject(req.user.id, projectId);
  const rows = db
    .prepare('SELECT id, name, language FROM files WHERE project_id = ? ORDER BY created_at ASC, id ASC')
    .all(project.id);
  const files = rows.map((f) => ({
    id: f.id,
    name: f.name,
    content: fileStore.readFile(req.user.id, project.id, f.name),
    language: f.language,
  }));
  res.json({ files });
});

// POST /api/projects/:id/files  { name, content } -> { file }
router.post(
  '/:id/files',
  validate([
    body('name').trim().matches(FILE_NAME_RE).withMessage('文件名不合法：仅支持 .cpp / .py 结尾（如 main.cpp、main.py）'),
    body('content').optional().isString().withMessage('content 必须是字符串'),
  ]),
  (req, res) => {
    const projectId = toProjectId(req.params.id);
    const project = getOwnedProject(req.user.id, projectId);
    const name = normalizeFileName(req.body?.name);
    const content = String(req.body?.content ?? '');

    if (!isValidFileName(name)) {
      throw new HttpError(400, '文件名不合法：仅支持 .cpp / .py 结尾（如 main.cpp、main.py）');
  }
  if (content.length > MAX_FILE_CONTENT) {
    throw new HttpError(413, `文件内容过大（最大 ${MAX_FILE_CONTENT / 1000}KB）`);
  }

  const language = languageFromName(name);
  fileStore.writeFile(req.user.id, project.id, name, content);
  let info;
  try {
    info = db
      .prepare('INSERT INTO files (project_id, name, file_path, language) VALUES (?, ?, ?, ?)')
      .run(project.id, name, fileStore.relFilePath(req.user.id, project.id, name), language);
  } catch (err) {
    // 名称重复时清理刚写入的磁盘文件
    fileStore.deleteFileOnDisk(req.user.id, project.id, name);
    throw err;
  }
  const file = db.prepare('SELECT id, name, language FROM files WHERE id = ?').get(info.lastInsertRowid);
  touchProject(project.id);
  res.status(201).json({ file: { ...file, content } });
  },
);

// PUT /api/projects/:id/files/:fileId  { content } -> { file }（自动保存）
router.put('/:id/files/:fileId', (req, res) => {
  const projectId = toProjectId(req.params.id);
  const fileId = toFileId(req.params.fileId);
  const project = getOwnedProject(req.user.id, projectId);
  const file = getOwnedFile(req.user.id, project.id, fileId);

  const content = String(req.body?.content ?? '');
  if (content.length > MAX_FILE_CONTENT) {
    throw new HttpError(413, `文件内容过大（最大 ${MAX_FILE_CONTENT / 1000}KB）`);
  }

  fileStore.writeFile(req.user.id, project.id, file.name, content);
  db.prepare('UPDATE files SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(file.id);
  touchProject(project.id);
  res.json({ file: { id: file.id, name: file.name, content, language: file.language } });
});

// PATCH /api/projects/:id/files/:fileId  { name } -> { file }
// （需求“重命名文件”的扩展端点，API 契约表中未列出的补充）
router.patch('/:id/files/:fileId', (req, res) => {
  const projectId = toProjectId(req.params.id);
  const fileId = toFileId(req.params.fileId);
  const project = getOwnedProject(req.user.id, projectId);
  const file = getOwnedFile(req.user.id, project.id, fileId);

  const name = normalizeFileName(req.body?.name);
  if (!isValidFileName(name)) {
    throw new HttpError(400, '文件名不合法：仅支持 .cpp / .py 结尾（如 main.cpp、main.py）');
  }

  const readBack = () => fileStore.readFile(req.user.id, project.id, name);

  if (name === file.name) {
    return res.json({ file: { id: file.id, name: file.name, content: readBack(), language: file.language } });
  }

  const language = languageFromName(name);
  fileStore.renameFileOnDisk(req.user.id, project.id, file.name, name);
  try {
    db.prepare(
      'UPDATE files SET name = ?, file_path = ?, language = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    ).run(name, fileStore.relFilePath(req.user.id, project.id, name), language, file.id);
  } catch (err) {
    // 数据库更新失败（如重名）：把磁盘文件改回去
    try {
      fileStore.renameFileOnDisk(req.user.id, project.id, name, file.name);
    } catch { /* 忽略回滚失败 */ }
    throw err;
  }
  touchProject(project.id);
  res.json({ file: { id: file.id, name, content: readBack(), language } });
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
