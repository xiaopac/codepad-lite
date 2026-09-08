const express = require('express');
const { body } = require('express-validator');
const HttpError = require('../utils/HttpError');
const { requireAuth } = require('../middleware/auth');
const piston = require('../services/piston');
const { VERSION_MAP } = require('../services/envBuilder');
const { validate } = require('../middleware/validation');
const { executeLimiter } = require('../utils/rateLimiter');
const { logger } = require('../utils/logger');
const { RUNNABLE_IDS } = require('../constants/languages');
const db = require('../db');

const router = express.Router();
router.use(requireAuth);

const MAX_CODE_LENGTH = 200000; // 200KB
const MAX_STDIN_LENGTH = 100000; // 100KB

// ── 并发控制：同一时刻最多 5 个执行任务（需求 2.2），防止资源耗尽 ──
class Semaphore {
  constructor(n) {
    this.n = n;
    this.queue = [];
  }
  async acquire() {
    if (this.n > 0) {
      this.n--;
      return;
    }
    await new Promise((resolve) => this.queue.push(resolve));
  }
  release() {
    if (this.queue.length > 0) this.queue.shift()();
    else this.n++;
  }
}
const execSemaphore = new Semaphore(5);

// 执行结果归类（管理员后台审计）
function classifyResult(result) {
  if (!result) return 'engine_error';
  if (result.compile_error != null) return 'compile_error';
  const code = Number(result.exit_code);
  if (code === 137) return 'timeout';
  if (code !== 0) return 'runtime_error';
  return 'success';
}

// 写入执行日志（失败不阻塞主流程）
function logExecution(userId, language, codeLength, status, result) {
  try {
    db.prepare(
      `INSERT INTO execution_logs (user_id, language, exit_code, execution_time, status, code_length)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      userId,
      language,
      result && typeof result.exit_code === 'number' ? result.exit_code : null,
      result && typeof result.execution_time === 'number' ? result.execution_time : null,
      status,
      codeLength,
    );
  } catch (err) {
    logger.warn(`[exec] 执行日志写入失败：${err.message}`);
  }
}

// POST /api/execute  { language: "c"|"cpp"|"python", code, stdin, environment_id? }
// -> { stdout, stderr, compile_error, execution_time, exit_code }（需鉴权）
const LANG_MSG = `仅支持 ${RUNNABLE_IDS.join(' / ')} 三种语言`;
router.post(
  '/',
  executeLimiter, // 每用户每分钟 10 次（需求 1.6）
  validate([
    body('language').isIn(RUNNABLE_IDS).withMessage(LANG_MSG),
    body('code').isString().withMessage('code 必须是字符串'),
    body('stdin').optional().isString().withMessage('stdin 必须是字符串'),
    body('environment_id').optional().isInt({ min: 1 }).withMessage('environment_id 不合法'),
  ]),
  async (req, res) => {
  const { language, code, stdin, environment_id } = req.body ?? {};

  if (!RUNNABLE_IDS.includes(language)) {
    throw new HttpError(400, LANG_MSG);
  }
  if (typeof code !== 'string') {
    throw new HttpError(400, 'code 必须是字符串');
  }
  if (code.length > MAX_CODE_LENGTH) {
    throw new HttpError(413, `代码过长（最大 ${MAX_CODE_LENGTH / 1000}KB）`);
  }
  const stdinText = typeof stdin === 'string' ? stdin.slice(0, MAX_STDIN_LENGTH) : '';

  // 自定义 Python 环境：解析环境并确定运行时版本
  let preferredVersion = undefined;
  if (language === 'python' && environment_id !== undefined && environment_id !== null) {
    const envId = Number(environment_id);
    if (!Number.isInteger(envId) || envId <= 0) throw new HttpError(400, 'environment_id 不合法');
    const env = db
      .prepare('SELECT * FROM environments WHERE id = ? AND user_id = ?')
      .get(envId, req.user.id);
    if (!env) throw new HttpError(404, '环境不存在');
    if (env.status === 'building') throw new HttpError(400, '环境正在构建中，请稍后再试');
    if (env.status !== 'ready') {
      throw new HttpError(400, `环境构建失败：${env.error || '未知错误'}，请到环境管理重建`);
    }
    preferredVersion = VERSION_MAP[env.python_version];
    if (!preferredVersion) throw new HttpError(400, '环境 Python 版本不受支持，请重建环境');
  }

  let result = null;
  let status = 'engine_error';
  await execSemaphore.acquire(); // 并发上限 5（需求 2.2）
  try {
    result = await piston.execute(language, code, stdinText, preferredVersion);
    status = classifyResult(result);
    res.json(result);
  } catch (err) {
    status = 'engine_error';
    throw err;
  } finally {
    logExecution(req.user.id, language, code.length, status, result);
    logger.info(
      `[exec] user#${req.user.id} ${language} -> ${status}` +
        (result && typeof result.execution_time === 'number' ? ` (${result.execution_time.toFixed(2)}s)` : ''),
    );
    execSemaphore.release();
  }
});

module.exports = router;
