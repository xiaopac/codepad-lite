const path = require('path');
require('dotenv').config();

const ROOT = path.join(__dirname, '..');

module.exports = {
  PORT: Number(process.env.PORT || 3001),
  JWT_SECRET: process.env.JWT_SECRET || 'codepad-lite-dev-secret-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d', // 需求锁定：JWT 有效期 7 天
  DB_PATH: process.env.DB_PATH || path.join(ROOT, 'data', 'codepad.db'),
  // 文件内容实际存储目录：./storage/users/{userId}/projects/{projectId}/
  STORAGE_DIR: process.env.STORAGE_DIR || path.join(ROOT, 'storage'),
  PISTON_URL: (process.env.PISTON_URL || 'http://localhost:2000').replace(/\/+$/, ''),
  // 自定义 Python 环境构建器（env-builder 服务）
  ENV_BUILDER_URL: (process.env.ENV_BUILDER_URL || 'http://localhost:3100').replace(/\/+$/, ''),
  // 交互式终端沙箱（term-runner 服务，工作区「终端」按钮与隐藏页 /web 使用）
  TERM_RUNNER_URL: (process.env.TERM_RUNNER_URL || 'http://localhost:4100').replace(/\/+$/, ''),
  // 每位用户同时可持有的终端会话数（普通用户放开后用于公平性控制）
  TERM_SESSIONS_PER_USER: Number(process.env.TERM_SESSIONS_PER_USER || 2),
  // 环境构建总超时（env-builder 内部最多 3 次换源重试，总预算 400s，需略大于它）
  ENV_BUILD_TIMEOUT_MS: Number(process.env.ENV_BUILD_TIMEOUT_MS || 450000),
  // 需求锁定：执行超时 10 秒（Piston 容器端也需 >= 该值，见 docker-compose.yml）
  COMPILE_TIMEOUT_MS: Number(process.env.COMPILE_TIMEOUT_MS || 10000),
  RUN_TIMEOUT_MS: Number(process.env.RUN_TIMEOUT_MS || 10000),
  // 对 Piston 单次 HTTP 请求的总超时（安装运行时包时单独放大）
  PISTON_HTTP_TIMEOUT_MS: Number(process.env.PISTON_HTTP_TIMEOUT_MS || 25000),

  // ── 企业治理 ──────────────────────────────────────────
  // 硬编码管理员（需求锁定）
  ADMIN_USERNAME: 'xiaopac',
  // 管理员初始密码（首次启动创建 xiaopac 时生效；生产务必通过环境变量修改）
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  // 注册时 IP 归属地查询开关（依赖外部免费接口，失败时降级为 null，不阻塞注册）
  GEO_LOOKUP_ENABLED: process.env.GEO_LOOKUP_ENABLED !== 'false',
  GEO_LOOKUP_TIMEOUT_MS: Number(process.env.GEO_LOOKUP_TIMEOUT_MS || 2500),
  // 系统监控的网络探测目标（host:port，逗号分隔；TCP 连接计时测延迟）
  NET_PROBE_TARGETS: process.env.NET_PROBE_TARGETS || '223.5.5.5:53,1.1.1.1:443',
  // 跨域白名单（逗号分隔）；留空 = 仅同源（推荐）
  CORS_ORIGINS: process.env.CORS_ORIGINS || '',
  // 日志目录（winston 按日轮转，保留 30 天）
  LOG_DIR: process.env.LOG_DIR || path.join(ROOT, 'logs'),
  // 多媒体上传单文件上限（字节，默认 15MB；受 50MB 用户配额约束）
  MAX_UPLOAD_BYTES: Number(process.env.MAX_UPLOAD_BYTES || 15 * 1024 * 1024),
};
