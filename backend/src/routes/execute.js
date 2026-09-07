const express = require('express');
const HttpError = require('../utils/HttpError');
const { requireAuth } = require('../middleware/auth');
const piston = require('../services/piston');
const db = require('../db');

const router = express.Router();
router.use(requireAuth);

const MAX_CODE_LENGTH = 200000; // 200KB
const MAX_STDIN_LENGTH = 100000; // 100KB

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
    console.warn('[log] 执行日志写入失败：', err.message);
  }
}

// POST /api/execute  { language: "cpp"|"python", code, stdin }
// -> { stdout, stderr, compile_error, execution_time, exit_code }（需鉴权）
router.post('/', async (req, res) => {
  const { language, code, stdin } = req.body ?? {};

  if (language !== 'cpp' && language !== 'python') {
    throw new HttpError(400, '仅支持 cpp / python 两种语言');
  }
  if (typeof code !== 'string') {
    throw new HttpError(400, 'code 必须是字符串');
  }
  if (code.length > MAX_CODE_LENGTH) {
    throw new HttpError(413, `代码过长（最大 ${MAX_CODE_LENGTH / 1000}KB）`);
  }
  const stdinText = typeof stdin === 'string' ? stdin.slice(0, MAX_STDIN_LENGTH) : '';

  let result = null;
  let status = 'engine_error';
  try {
    result = await piston.execute(language, code, stdinText);
    status = classifyResult(result);
    res.json(result);
  } catch (err) {
    status = 'engine_error';
    throw err;
  } finally {
    logExecution(req.user.id, language, code.length, status, result);
  }
});

module.exports = router;
