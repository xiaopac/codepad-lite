const HttpError = require('../utils/HttpError');

function notFound(req, res) {
  res.status(404).json({ error: '接口不存在' });
}

// express-async-errors 会把 async 路由中的异常转发到这里
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err && (err.code === 'SQLITE_CONSTRAINT' || err.code === 'SQLITE_CONSTRAINT_UNIQUE')) {
    return res.status(409).json({ error: '名称已存在，请换一个试试' });
  }
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: '请求体不是合法的 JSON' });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: '请求体过大' });
  }
  console.error('[error]', err);
  res.status(500).json({ error: '服务器内部错误，请稍后重试' });
}

module.exports = { notFound, errorHandler };
