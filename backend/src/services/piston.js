// Piston 执行引擎客户端（HTTP 调用自托管 Piston 的 /api/v2/*）
// 参考：https://piston.readthedocs.io/en/latest/api-v2/
//      https://github.com/engineer-man/piston/blob/master/readme.md
const config = require('../config');
const HttpError = require('../utils/HttpError');
const { LANGUAGES } = require('../constants/languages');

// 项目支持的语言 -> Piston 包索引中的语言名。
// 注意（已对本项目部署的真实 Piston 实测验证）：
//  - C / C++ 在包索引 /api/v2/packages 中共享 "gcc" 包（版本 10.2.0）；
//  - /api/v2/runtimes 中 C 的语言名是 "c"（别名 ["gcc"]），C++ 是 "c++"（别名 ["cpp","g++"]）；
//  - execute 接口接受 "c" 与 "cpp"，会自动解析到对应运行时；
//  - 源文件名决定编译器：main.c → gcc，main.cpp → g++（详见 constants/languages.js）。
const REQUIRED_LANGUAGES = Object.keys(LANGUAGES);
const PACKAGE_LANGUAGE = {};
for (const [id, def] of Object.entries(LANGUAGES)) PACKAGE_LANGUAGE[id] = def.packageLanguage;

// 运行时条目是否匹配某个项目语言（语言名 + 别名双重匹配）
function runtimeMatches(runtime, lang) {
  if (!runtime) return false;
  if (runtime.language === lang) return true;
  if (lang === 'cpp' && runtime.language === 'c++') return true;
  const aliases = Array.isArray(runtime.aliases) ? runtime.aliases : [];
  return aliases.includes(lang) || (lang === 'cpp' && aliases.includes('c++'));
}

let runtimesPromise = null;
let ensurePromise = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, options = {}, timeoutMs = config.PISTON_HTTP_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (!res.ok) {
      const message = (data && (data.message || data.error)) || `HTTP ${res.status}`;
      throw new HttpError(502, `代码执行引擎返回错误：${message}`);
    }
    return data;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (err && err.name === 'AbortError') {
      throw new HttpError(504, '代码执行引擎响应超时');
    }
    throw new HttpError(503, '代码执行引擎（Piston）不可用，请确认服务已启动');
  } finally {
    clearTimeout(timer);
  }
}

function invalidateRuntimes() {
  runtimesPromise = null;
}

// GET /api/v2/runtimes（带缓存；失败后允许下次重试）
async function getRuntimes() {
  if (!runtimesPromise) {
    runtimesPromise = fetchJson(`${config.PISTON_URL}/api/v2/runtimes`, {}, 15000)
      .then((data) => {
        if (!Array.isArray(data)) throw new HttpError(503, 'Piston 运行时列表格式异常');
        return data;
      })
      .catch((err) => {
        runtimesPromise = null;
        throw err;
      });
  }
  return runtimesPromise;
}

// POST /api/v2/packages { language, version } 安装一个运行时包（可能耗时 1-2 分钟）
async function installPackage(language, version) {
  await fetchJson(
    `${config.PISTON_URL}/api/v2/packages`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language, version }),
    },
    300000, // 安装包耗时较长
  );
}

// 后台常驻任务：等 Piston 就绪后自动安装缺失的 cpp / python / c 运行时。
// 不设总时限：Piston 镜像首次拉取可能耗时数分钟，只要服务最终就绪就会自动补齐；
// 中途失败无限重试（日志按 30 秒节流，避免刷屏）。
// 这样 docker compose up 之后无需任何手工步骤，代码即可运行。
function ensureRuntimes() {
  if (!ensurePromise) {
    ensurePromise = runEnsure().catch((err) => {
      ensurePromise = null; // 意外崩溃时允许下次调用重新发起
      throw err;
    });
  }
  return ensurePromise;
}

async function runEnsure() {
  let attempt = 0;
  let lastLog = '';
  for (;;) {
    attempt += 1;
    try {
      // 先查本地运行时列表（/api/v2/runtimes 不触发 Piston 的网络索引拉取，
      // 避免 Piston 因索引拉取失败而崩溃——它对该失败无容错）
      const localRuntimes = await getRuntimes();
      const missingNow = REQUIRED_LANGUAGES.filter(
        (lang) => !localRuntimes.some((r) => runtimeMatches(r, lang)),
      );
      if (missingNow.length === 0) {
        console.log('[piston] cpp / python / c 运行时已就绪');
        return;
      }

      // 仅当存在缺失的运行时，才访问包索引（此时安装本就需要联网）
      const packages = await fetchJson(`${config.PISTON_URL}/api/v2/packages`, {}, 15000);
      if (!Array.isArray(packages)) throw new HttpError(503, 'Piston 包列表格式异常');

      // 汇总每个语言：是否已装任一版本 + 列表中最后一个（通常最新）条目。
      // 注意：每个语言只装一个版本；只要任一版本已安装就跳过，
      // 否则会把该语言的所有历史版本逐个装一遍。
      const byLang = {};
      for (const p of packages) {
        if (!p) continue;
        const required = REQUIRED_LANGUAGES.find((lang) => PACKAGE_LANGUAGE[lang] === p.language);
        if (!required) continue;
        const info = (byLang[required] ||= { anyInstalled: false, newest: null });
        info.newest = p;
        if (p.installed === true) info.anyInstalled = true;
      }

      for (const lang of REQUIRED_LANGUAGES) {
        const info = byLang[lang];
        if (!info || info.anyInstalled || !info.newest) continue;
        console.log(`[piston] 正在安装运行时 ${info.newest.language} ${info.newest.language_version}（约 1-2 分钟）…`);
        await installPackage(info.newest.language, info.newest.language_version);
        invalidateRuntimes();
      }
      // 安装完成后回到循环顶部，重新用 runtimes 校验是否就绪
    } catch (err) {
      const msg = err.message || String(err);
      // 新错误立即输出；同样的错误每 6 次尝试（约 30 秒）输出一次
      if (attempt % 6 === 1 || msg !== lastLog) {
        console.warn(`[piston] 等待执行引擎就绪：${msg}`);
        lastLog = msg;
      }
    }
    await sleep(5000);
  }
}

// 确保指定版本运行时已安装（自定义环境构建用），缺失则通过包管理 API 安装
async function ensurePythonRuntime(fullVersion) {
  const runtimes = await getRuntimes();
  if (runtimes.some((r) => r && r.language === 'python' && r.version === fullVersion)) return;
  await installPackage('python', fullVersion);
  invalidateRuntimes();
}

// 执行代码并映射为前端契约：
// { stdout, stderr, compile_error, execution_time, exit_code }
// preferredVersion：自定义 Python 环境指定的运行时版本（如 3.10.0）
async function execute(language, code, stdin, preferredVersion) {
  const startedAt = Date.now();

  let runtimes = await getRuntimes();
  let runtime = runtimes.find((r) =>
    preferredVersion
      ? runtimeMatches(r, language) && r.version === preferredVersion
      : runtimeMatches(r, language),
  );
  if (!runtime) {
    // 缓存的运行时列表可能是在安装完成前获取的旧值：刷新一次再看
    invalidateRuntimes();
    runtimes = await getRuntimes();
    runtime = runtimes.find((r) =>
      preferredVersion
        ? runtimeMatches(r, language) && r.version === preferredVersion
        : runtimeMatches(r, language),
    );
  }
  if (!runtime) {
    if (preferredVersion) {
      throw new HttpError(
        503,
        `环境对应的 Python ${preferredVersion} 运行时未安装，请到「环境管理」重建该环境`,
      );
    }
    // 运行时缺失：确保后台自动安装任务在跑（无时限、会重试），并给出友好提示
    ensureRuntimes().catch(() => {});
    throw new HttpError(
      503,
      `Piston 尚未安装 ${language} 运行时，正在后台自动安装，请 1-2 分钟后重试`,
    );
  }
  const version = runtime.version;

  const payload = {
    language,
    version,
    files: [{ name: LANGUAGES[language]?.sourceName || 'main.txt', content: code }],
    stdin,
    compile_timeout: config.COMPILE_TIMEOUT_MS, // 需求锁定：超时 10 秒
    run_timeout: config.RUN_TIMEOUT_MS,
  };

  const data = await fetchJson(`${config.PISTON_URL}/api/v2/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const run = data && typeof data.run === 'object' && data.run !== null ? data.run : {};
  const compile = data && typeof data.compile === 'object' && data.compile !== null ? data.compile : {};

  const compileFailed = typeof compile.code === 'number' && compile.code !== 0;

  let exitCode;
  if (typeof run.code === 'number' && run.code !== null) {
    exitCode = run.code;
  } else if (run.signal) {
    exitCode = 137; // 被信号终止（如超时 SIGKILL）
  } else if (compileFailed) {
    exitCode = compile.code;
  } else {
    exitCode = 0;
  }

  // Piston 返回 wall_time（毫秒）；字段缺失时用后端实测的 HTTP 往返时间兜底
  const executionTime =
    typeof run.wall_time === 'number' ? run.wall_time / 1000 : (Date.now() - startedAt) / 1000;

  let stderr = typeof run.stderr === 'string' ? run.stderr : '';
  if (run.status === 'TO') {
    stderr = `${stderr}${stderr ? '\n' : ''}[CodePad] 程序运行超过 ${config.RUN_TIMEOUT_MS / 1000} 秒，已被终止`;
  }

  return {
    stdout: typeof run.stdout === 'string' ? run.stdout : '',
    stderr,
    compile_error: compileFailed
      ? String(compile.stderr || compile.stdout || compile.message || '编译失败')
      : null,
    execution_time: executionTime,
    exit_code: exitCode,
  };
}

// 轻量健康探测（管理员后台“系统监控”用）：短超时拉取运行时列表
async function ping(timeoutMs = 3000) {
  return fetchJson(`${config.PISTON_URL}/api/v2/runtimes`, {}, timeoutMs);
}

module.exports = { execute, ensureRuntimes, ensurePythonRuntime, getRuntimes, ping };
