// 统一日志：winston 控制台 + 按日轮转文件（保留 30 天）
const fs = require('fs');
const path = require('path');
const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');
const config = require('../config');

try {
  fs.mkdirSync(config.LOG_DIR, { recursive: true });
} catch { /* 只读环境忽略 */ }

const fmt = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(({ level, message, timestamp }) => `${timestamp} [${level}] ${message}`),
);

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fmt,
  transports: [
    new transports.Console(),
    new (transports.DailyRotateFile)({
      dirname: config.LOG_DIR,
      filename: 'codepad-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d', // 需求：日志保留 30 天
      maxSize: '20m',
    }),
  ],
});

// 敏感数据脱敏：邮箱 -> u***@domain.com（日志中禁止出现完整邮箱/密码/JWT）
function maskEmail(email) {
  if (!email) return '(anonymous)';
  const str = String(email);
  const at = str.indexOf('@');
  if (at < 0) return `${str.slice(0, Math.min(2, str.length))}***`;
  const user = str.slice(0, at);
  const domain = str.slice(at + 1);
  return `${user.slice(0, Math.min(2, user.length))}***@${domain}`;
}

module.exports = { logger, maskEmail };
