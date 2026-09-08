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
  invalidateUsedCache(userId);
}

function readFile(userId, projectId, name) {
  try {
    return fs.readFileSync(absFilePath(userId, projectId, name), 'utf8');
  } catch (err) {
    if (err && err.code === 'ENOENT') return '';
    throw err;
  }
}

// 文件在磁盘上的实际字节数（不存在为 0）
function fileSize(userId, projectId, name) {
  try {
    return fs.statSync(absFilePath(userId, projectId, name)).size;
  } catch {
    return 0;
  }
}

function renameFileOnDisk(userId, projectId, oldName, newName) {
  ensureProjectDir(userId, projectId);
  fs.renameSync(absFilePath(userId, projectId, oldName), absFilePath(userId, projectId, newName));
}

function deleteFileOnDisk(userId, projectId, name) {
  try {
    fs.unlinkSync(absFilePath(userId, projectId, name));
    invalidateUsedCache(userId);
  } catch (err) {
    if (!err || err.code !== 'ENOENT') throw err;
  }
}

function deleteProjectDir(userId, projectId) {
  fs.rmSync(projectDir(userId, projectId), { recursive: true, force: true });
  invalidateUsedCache(userId);
}

// ── 已用空间统计（递归目录计算，5 秒 TTL 缓存） ──
const usedCache = new Map(); // userId -> { bytes, at }

function invalidateUsedCache(userId) {
  usedCache.delete(String(userId));
}

function getUserUsedBytes(userId) {
  const key = String(userId);
  const hit = usedCache.get(key);
  if (hit && Date.now() - hit.at < 5000) return hit.bytes;

  let total = 0;
  try {
    const dir = userDir(userId);
    if (fs.existsSync(dir)) {
      const walk = (p) => {
        for (const entry of fs.readdirSync(p, { withFileTypes: true })) {
          const full = path.join(p, entry.name);
          if (entry.isDirectory()) walk(full);
          else if (entry.isFile()) {
            try {
              total += fs.statSync(full).size;
            } catch { /* 忽略瞬时文件 */ }
          }
        }
      };
      walk(dir);
    }
  } catch { /* 权限等异常按 0 处理 */ }

  usedCache.set(key, { bytes: total, at: Date.now() });
  return total;
}

module.exports = {
  userDir,
  projectDir,
  absFilePath,
  relFilePath,
  ensureProjectDir,
  writeFile,
  readFile,
  fileSize,
  renameFileOnDisk,
  deleteFileOnDisk,
  deleteProjectDir,
  getUserUsedBytes,
  invalidateUsedCache,
};
