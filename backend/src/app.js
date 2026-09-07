const express = require('express');
const cors = require('cors');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { requireAuth } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const projectRoutes = require('./routes/projects');
const executeRoutes = require('./routes/execute');
const adminRoutes = require('./routes/admin');

const app = express();

app.disable('x-powered-by');
// nginx 反代一层：信任 X-Forwarded-For，使注册指纹拿到真实客户端 IP
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'codepad-lite-backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/user', requireAuth, userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/execute', executeRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
