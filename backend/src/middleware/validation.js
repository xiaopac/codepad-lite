// 统一参数校验（express-validator）：类型 / 长度 / 格式，失败返回 400 + 第一条中文错误
const { validationResult } = require('express-validator');
const HttpError = require('../utils/HttpError');

// 密码复杂度（需求 1.1）：≥8 位，含大写 + 小写 + 数字
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/;
const PASSWORD_MSG = '密码至少 8 位，且需包含大写字母、小写字母和数字';

// 项目名：字母/数字/下划线/中文/空格/点/短横线
const PROJECT_NAME_RE = /^[A-Za-z0-9_\u4e00-\u9fa5 .-]{1,50}$/;
// 文件名：白名单 + 扩展名，天然防 ../ 路径穿越（.c 为 C 语言）
const FILE_NAME_RE = /^[A-Za-z0-9_-]{1,100}\.(cpp|py|c)$/i;
// 第三方库名（支持版本限定：numpy、numpy==1.24.2、requests>=2.28,<3 等），防 pip 参数注入
const PKG_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*(==|>=|<=|!=|~=|===|>|<)?[A-Za-z0-9._*+!-]*$/;

// ── 高级模式：自定义 pip 构建参数白名单校验（需求 4.3，安全可控）──
// 只允许白名单内的 pip 选项；任何系统命令、shell 元字符一律拒绝。
const BUILD_URL_FLAGS = new Set(['-i', '--index-url', '--extra-index-url', '--find-links']);
const BUILD_VALUE_FLAGS = new Set([
  '--only-binary', '--no-binary', '--upgrade-strategy', '--timeout', '--retries', '--trusted-host',
]);
const BUILD_NOVAL_FLAGS = new Set([
  '--no-cache-dir', '--prefer-binary', '--no-deps', '--no-build-isolation', '--pre', '--upgrade',
]);
const BUILD_URL_RE = /^https:\/\/[A-Za-z0-9._\-/:~+%?=]+$/;
const BUILD_VALUE_RE = /^[A-Za-z0-9._:+,~*-]+$/;

/**
 * 校验并规范化自定义 pip 参数。
 * @returns {{ ok: true, tokens: string[] } | { ok: false, error: string }}
 */
function sanitizeBuildCommand(text) {
  const input = String(text || '').trim();
  if (!input) return { ok: true, tokens: [] };
  if (input.length > 500) return { ok: false, error: '自定义参数过长（最多 500 字符）' };
  if (/[\n\r;|&`$<>\\'"]/.test(input)) {
    return { ok: false, error: '包含非法字符（不允许 ; | & ` $ 引号等）' };
  }
  const toks = input.split(/\s+/).filter(Boolean);
  if (toks.length > 30) return { ok: false, error: '参数过多（最多 30 个）' };

  const out = [];
  for (let i = 0; i < toks.length; i++) {
    const tok = toks[i];
    if (!tok.startsWith('-')) {
      return { ok: false, error: `只能填写 pip 参数（如 --pre），收到：${tok}` };
    }
    const eqIdx = tok.indexOf('=');
    const flag = eqIdx === -1 ? tok : tok.slice(0, eqIdx);
    const val = eqIdx === -1 ? null : tok.slice(eqIdx + 1);

    if (BUILD_NOVAL_FLAGS.has(flag)) {
      if (val !== null) return { ok: false, error: `${flag} 不接受参数值` };
      out.push(tok);
    } else if (BUILD_URL_FLAGS.has(flag)) {
      if (val !== null) {
        if (!BUILD_URL_RE.test(val)) return { ok: false, error: `${flag} 仅允许 https:// 地址` };
        out.push(tok);
      } else {
        const next = toks[i + 1];
        if (!next || !BUILD_URL_RE.test(next)) {
          return { ok: false, error: `${flag} 需要 https:// 地址（建议用 ${flag}=https://… 形式）` };
        }
        out.push(tok, next);
        i++;
      }
    } else if (BUILD_VALUE_FLAGS.has(flag)) {
      if (val !== null) {
        if (!BUILD_VALUE_RE.test(val)) return { ok: false, error: `${flag} 参数值不合法` };
        out.push(tok);
      } else {
        const next = toks[i + 1];
        if (!next || !BUILD_VALUE_RE.test(next)) return { ok: false, error: `${flag} 需要参数值` };
        out.push(tok, next);
        i++;
      }
    } else {
      return { ok: false, error: `不允许的参数：${flag}` };
    }
  }
  return { ok: true, tokens: out };
}

function validate(schema) {
  const chain = Array.isArray(schema) ? schema : [schema];
  return [
    ...chain,
    (req, res, next) => {
      const errors = validationResult(req);
      if (errors.isEmpty()) return next();
      next(new HttpError(400, errors.array()[0].msg));
    },
  ];
}

module.exports = {
  validate,
  PASSWORD_RE,
  PASSWORD_MSG,
  PROJECT_NAME_RE,
  FILE_NAME_RE,
  PKG_RE,
  sanitizeBuildCommand,
};
