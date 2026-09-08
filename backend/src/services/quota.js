// 存储配额：默认 50MB/用户，写入前校验（超配额返回 413 友好提示）
const db = require('../db');
const HttpError = require('../utils/HttpError');
const fileStore = require('./fileStore');

function getUserQuotaMb(userId) {
  const row = db.prepare('SELECT storage_quota FROM users WHERE id = ?').get(userId);
  return Number(row?.storage_quota) || 50;
}

// 校验写入 incomingBytes 后是否超配额；返回 { quota, used }
function assertQuota(userId, incomingBytes) {
  const quota = getUserQuotaMb(userId);
  const used = fileStore.getUserUsedBytes(userId);
  if (incomingBytes > 0 && used + incomingBytes > quota * 1024 * 1024) {
    throw new HttpError(
      413,
      `存储空间不足：已用 ${(used / 1048576).toFixed(2)}MB / 配额 ${quota}MB，请删除部分文件或联系管理员扩容`,
    );
  }
  return { quota, used };
}

module.exports = { getUserQuotaMb, assertQuota };
