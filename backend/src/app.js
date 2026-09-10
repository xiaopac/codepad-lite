const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const db = require('./db');
const config = require('./config');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { requireAuth } = require('./middleware/auth');
const { globalLimiter } = require('./utils/rateLimiter');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const projectRoutes = require('./routes/projects');
const executeRoutes = require('./routes/execute');
const adminRoutes = require('./routes/admin');
const environmentRoutes = require('./routes/environments');
const terminalRoutes = require('./routes/terminal');

const app = express();

app.disable('x-powered-by');
// nginx 反代一层：信任 X-Forwarded-For，使限流与注册指纹拿到真实客户端 IP
app.set('trust proxy', 1);

// 安全响应头（helmet）。CSP 由 nginx 在 HTML 响应上统一设置，避免双 CSP 头；
// COEP 关闭以保证 Monaco 的 blob worker 正常工作
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

// CORS：默认同源（生产走 nginx 反代、开发走 vite 代理，均无需跨域）。
// 确需跨域时在 .env 用 CORS_ORIGINS 显式配置白名单。
const allowedOrigins = String(config.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
if (allowedOrigins.length > 0) {
  app.use(cors({ origin: allowedOrigins }));
}

app.use(express.json({ limit: '24mb' })); // 24MB：多媒体 base64 上传；代码大小在 execute 内单独校验

// 全局兜底限流（每 IP 120 次/分钟）
app.use(globalLimiter);

// 健康检查：数据库连通性（容器健康检查与监控共用）
app.get('/api/health', (req, res) => {
  let dbOk = false;
  try {
    db.prepare('SELECT 1').get();
    dbOk = true;
  } catch { /* 数据库不可用 */ }
  res.status(dbOk ? 200 : 503).json({
    ok: dbOk,
    service: 'codepad-lite-backend',
    db: dbOk ? 'up' : 'down',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/user', requireAuth, userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/execute', executeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/environments', environmentRoutes);
app.use('/api/terminal', terminalRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
