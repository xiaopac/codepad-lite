// 自定义 Python 环境构建编排：
// 1) 确保 Piston 已安装对应版本的 Python 运行时（缺失则通过包管理 API 安装）
// 2) 调用 env-builder 服务，把第三方库 pip 进共享卷的 site-packages
//     （Piston 每次执行复制整个运行时目录，因此安装对后续执行持久生效）
const config = require('../config');
const db = require('../db');
const HttpError = require('../utils/HttpError');
const piston = require('./piston');

// 用户选择版本 -> Piston 运行时完整版本
const VERSION_MAP = { '3.9': '3.9.4', '3.10': '3.10.0', '3.11': '3.11.0' };

function packagesOf(env) {
  try {
    const list = JSON.parse(env.packages || '[]');
    return Array.isArray(list) ? list.filter((p) => typeof p === 'string' && p) : [];
  } catch {
    return [];
  }
}

function setStatus(id, status, error = null) {
  db.prepare(
    "UPDATE environments SET status = ?, error = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
  ).run(status, error, id);
}

// 异步构建（不阻塞请求）；失败会把错误信息写回环境记录
async function buildEnvironment(envId) {
  const env = db.prepare('SELECT * FROM environments WHERE id = ?').get(envId);
  if (!env) return;

  setStatus(envId, 'building');
  try {
    const fullVersion = VERSION_MAP[env.python_version];
    if (!fullVersion) throw new HttpError(400, '不支持的 Python 版本');

    // 1. 确保运行时已安装（需要 Piston 可达 + GitHub 网络）
    await piston.ensurePythonRuntime(fullVersion);

    // 2. 安装第三方库
    const packages = packagesOf(env);
    if (packages.length > 0) {
      const target = `/pkgs/python/${fullVersion}/lib/python${env.python_version}/site-packages`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.ENV_BUILD_TIMEOUT_MS);
      let res;
      try {
        res = await fetch(`${config.ENV_BUILDER_URL}/build`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target,
            python_version: env.python_version,
            packages,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
      let data = null;
      try {
        data = await res.json();
      } catch { /* 忽略 */ }
      if (!res.ok) {
        const message = (data && data.error) || `构建服务返回 HTTP ${res.status}`;
        throw new Error(message);
      }
    }

    setStatus(envId, 'ready');
    console.log(`[env] 环境 #${envId}「${env.name}」构建完成（Python ${env.python_version}）`);
  } catch (err) {
    const message = err.message || String(err);
    setStatus(envId, 'failed', message);
    console.warn(`[env] 环境 #${envId} 构建失败：${message}`);
  }
}

module.exports = { buildEnvironment, packagesOf, VERSION_MAP };
