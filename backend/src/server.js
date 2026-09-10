// 必须先于任何路由 require，保证 async 错误被统一捕获
require('express-async-errors');

const fs = require('fs');
const http = require('http');
const config = require('./config');
require('./db'); // 初始化数据库 + 自动迁移
const { seedAdmin } = require('./services/adminSeed');
const app = require('./app');
const piston = require('./services/piston');
const { attachTerminalWs } = require('./terminalWs');
const { logger } = require('./utils/logger');

fs.mkdirSync(config.STORAGE_DIR, { recursive: true });

// 密钥自检：JWT_SECRET 过短（<32 字符）只警告不阻断，生产务必使用强随机值
if (config.JWT_SECRET.length < 32) {
  logger.warn('[security] JWT_SECRET 长度不足 32 字符，生产环境请使用 openssl rand -hex 32 生成强密钥');
}

// 硬编码管理员 xiaopac：首次启动自动创建，之后每次启动自愈（admin + active）
seedAdmin();

// HTTP + WebSocket 共用一个 server：/api/terminal/ws 由 attachTerminalWs 处理 upgrade
const server = http.createServer(app);
attachTerminalWs(server);

server.listen(config.PORT, () => {
  logger.info(`CodePad Lite 后端已启动：http://localhost:${config.PORT}`);
  logger.info(`Piston 地址：${config.PISTON_URL}`);
  logger.info(`终端沙箱地址：${config.TERM_RUNNER_URL}`);
});

// 后台探测 Piston 并自动安装 cpp / python 运行时（不阻塞服务启动，失败会自动重试）
piston.ensureRuntimes().catch((err) => {
  logger.warn(`[piston] 运行时初始化任务异常：${err.message}`);
});
