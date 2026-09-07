// 文件内容实际存储在服务器文件系统：
//   ./storage/users/{userId}/projects/{projectId}/{fileName}
// SQLite 仅保存元数据（名称、路径映射）。
const fs = require('fs');
const path = require('path');
const config = require('../config');

function userDir(userId) {
  return path.join(config.STORAGE_DIR, 'users', String(userId));
}

function projectDir(userId, projectId) {
  return path.join(userDir(userId), 'projects', String(projectId));
}

function absFilePath(userId, projectId, name) {
  return path.join(projectDir(userId, projectId), name);
}

function relFilePath(userId, projectId, name) {
  return ['users', String(userId), 'projects', String(projectId), name].join('/');
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
