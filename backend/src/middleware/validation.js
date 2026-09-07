// 统一参数校验（express-validator）：类型 / 长度 / 格式，失败返回 400 + 第一条中文错误
const { validationResult } = require('express-validator');
const HttpError = require('../utils/HttpError');

// 密码复杂度（需求 1.1）：≥8 位，含大写 + 小写 + 数字
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/;
const PASSWORD_MSG = '密码至少 8 位，且需包含大写字母、小写字母和数字';

// 项目名：字母/数字/下划线/中文/空格/点/短横线
const PROJECT_NAME_RE = /^[A-Za-z0-9_\u4e00-\u9fa5 .-]{1,50}$/;
// 文件名：白名单 + 扩展名，天然防 ../ 路径穿越
const FILE_NAME_RE = /^[A-Za-z0-9_-]{1,100}\.(cpp|py)$/i;
// 第三方库名：字母数字开头，防 pip 参数注入
const PKG_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

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

module.exports = { validate, PASSWORD_RE, PASSWORD_MSG, PROJECT_NAME_RE, FILE_NAME_RE, PKG_RE };
