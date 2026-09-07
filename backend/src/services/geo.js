// 注册指纹采集：IP 归属地查询（尽力而为，失败不阻塞注册）
// 优先 ip-api.com（免费档，支持 lang=zh-CN 返回中文地名），失败回退 ipapi.co。
const config = require('../config');

const successCache = new Map(); // IP -> "中国, 广东, 深圳"（成功结果永久缓存）
const failureCache = new Map(); // IP -> 失败时间戳（60 秒内不再重试）

// 私网/本机地址不做外网查询
const PRIVATE_RE =
  /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|169\.254\.|::1$|fc|fd|fe80)/i;

function normalizeIp(ip) {
  return String(ip || '').replace(/^::ffff:/, '');
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// 查询 IP 归属地，返回 "中国, 广东, 深圳" 形式；查询失败返回 null
async function lookupLocation(rawIp) {
  const ip = normalizeIp(rawIp);
  if (!ip || PRIVATE_RE.test(ip)) return '内网/本机';
  if (!config.GEO_LOOKUP_ENABLED) return null;
  if (successCache.has(ip)) return successCache.get(ip);

  const lastFail = failureCache.get(ip) || 0;
  if (Date.now() - lastFail < 60000) return null;

  const timeoutMs = config.GEO_LOOKUP_TIMEOUT_MS;

  // 主：ip-api（免费档仅 HTTP，支持中文地名）
  try {
    const data = await fetchWithTimeout(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?lang=zh-CN&fields=status,country,regionName,city`,
      timeoutMs,
    );
    if (data && data.status === 'success') {
      const location = [data.country, data.regionName, data.city]
        .filter((s) => s && s.trim())
        .join(', ');
      const result = location || '未知';
      successCache.set(ip, result);
      return result;
    }
  } catch { /* 尝试备用源 */ }

  // 备：ipapi.co（英文地名）
  try {
    const data = await fetchWithTimeout(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, timeoutMs);
    if (data && data.country_name) {
      const location = [data.country_name, data.region, data.city]
        .filter((s) => s && s.trim())
        .join(', ');
      const result = location || '未知';
      successCache.set(ip, result);
      return result;
    }
  } catch { /* 放弃，返回 null */ }

  failureCache.set(ip, Date.now());
  return null;
}

module.exports = { lookupLocation };
