// 终端沙箱环境信息（term-runner 容器）：
// 终端跑在独立沙箱里，Python 与预装库由镜像/共享卷决定，与用户的「项目 Python 环境」是两套。
// 这里做进程内缓存，供用户端（终端面板「ⓘ 沙箱」）与管理员端（后台沙箱库管理）共用。
const config = require('../config');
const HttpError = require('../utils/HttpError');

const DEFAULT_TTL_MS = 10 * 60 * 1000;
let cache = { at: 0, data: null };

async function getSandboxEnv({ refresh = false, ttl = DEFAULT_TTL_MS } = {}) {
  const now = Date.now();
  if (!refresh && cache.data && now - cache.at < ttl) return cache.data;

  let r;
  try {
    r = await fetch(`${config.TERM_RUNNER_URL}/env${refresh ? '?refresh=1' : ''}`, {
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new HttpError(503, '终端沙箱服务不可用，请稍后再试');
  }
  if (!r.ok) throw new HttpError(503, '暂时无法读取终端沙箱环境信息');
  const data = await r.json().catch(() => null);
  if (!data || typeof data !== 'object') throw new HttpError(503, '终端沙箱环境信息格式异常');
  cache = { at: now, data };
  return data;
}

// 管理员装/卸库之后调用：清后端缓存（下次请求会带 refresh=1 让沙箱重新探测）
function invalidateSandboxEnv() {
  cache = { at: 0, data: null };
}

module.exports = { getSandboxEnv, invalidateSandboxEnv };
