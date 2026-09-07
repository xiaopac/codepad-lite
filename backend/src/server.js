// 必须先于任何路由 require，保证 async 错误被统一捕获
require('express-async-errors');

const fs = require('fs');
const config = require('./config');
require('./db'); // 初始化数据库 + 自动迁移
const { seedAdmin } = require('./services/adminSeed');
const app = require('./app');
const piston = require('./services/piston');

fs.mkdirSync(config.STORAGE_DIR, { recursive: true });

// 硬编码管理员 xiaopac：首次启动自动创建，之后每次启动自愈（admin + active）
seedAdmin();

app.listen(config.PORT, () => {
  console.log(`CodePad Lite 后端已启动：http://localhost:${config.PORT}`);
  console.log(`Piston 地址：${config.PISTON_URL}`);
});

// 后台探测 Piston 并自动安装 cpp / python 运行时（不阻塞服务启动，失败会自动重试）
piston.ensureRuntimes().catch((err) => {
  console.warn('[piston] 运行时初始化任务异常：', err.message);
});
