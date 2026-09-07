// 文件内容实际存储在服务器文件系统：
//   ./storage/users/{userId}/projects/{projectId}/{fileName}
// SQLite 仅保存元数据（名称、路径映射）。
// 安全：所有路径经 path.resolve 规范化后校验必须落在项目目录内（防御性路径穿越防护，
// 上层另有文件名白名单校验，双重保险）。
const fs = require('fs');
const path = require('path');
const config = require('../config');

function userDir(userId) {
  return path.join(config.STORAGE_DIR, 'users', String(userId));
}

function projectDir(userId, projectId) {
  return path.join(userDir(userId), 'projects', String(projectId));
}

// 规范化 + 越界检查：目标必须等于或在项目目录之下
function assertInside(dir, name) {
  const base = path.resolve(dir);
  const target = path.resolve(base, String(name));
  if (target !== base && !target.startsWith(base + path.sep)) {
    throw new Error('非法路径：越出允许范围');
  }
  return target;
}

function absFilePath(userId, projectId, name) {
  return assertInside(projectDir(userId, projectId), name);
}

function relFilePath(userId, projectId, name) {
  return ['users', String(userId), 'projects', String(projectId), String(name)].join('/');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function ensureProjectDir(userId, projectId) {
  ensureDir(projectDir(userId, projectId));
}

function writeFile(userId, projectId, name, content) {
  ensureProjectDir(userId, projectId);
  fs.writeFileSync(absFilePath(userId, projectId, name), String(content ?? ''), 'utf8');
}

function readFile(userId, projectId, name) {
  try {
    return fs.readFileSync(absFilePath(userId, projectId, name), 'utf8');
  } catch (err) {
    if (err && err.code === 'ENOENT') return '';
    throw err;
  }
}

function renameFileOnDisk(userId, projectId, oldName, newName) {
  ensureProjectDir(userId, projectId);
  fs.renameSync(absFilePath(userId, projectId, oldName), absFilePath(userId, projectId, newName));
}

function deleteFileOnDisk(userId, projectId, name) {
  try {
    fs.unlinkSync(absFilePath(userId, projectId, name));
  } catch (err) {
    if (!err || err.code !== 'ENOENT') throw err;
  }
}

function deleteProjectDir(userId, projectId) {
  fs.rmSync(projectDir(userId, projectId), { recursive: true, force: true });
}

module.exports = {
  userDir,
  projectDir,
  absFilePath,
  relFilePath,
  ensureProjectDir,
  writeFile,
  readFile,
  renameFileOnDisk,
  deleteFileOnDisk,
  deleteProjectDir,
};
