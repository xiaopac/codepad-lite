// 硬编码管理员 xiaopac 种子：启动时确保存在，且密码/角色/状态始终以配置为准（自愈式）。
// 语义：xiaopac 的密码由 ADMIN_PASSWORD 唯一控制（默认 admin123，生产务必修改）；
// 即使数据库被篡改或该账号此前以普通用户身份注册过，重启后也会被矫正为管理员。
const bcrypt = require('bcryptjs');
const db = require('../db');
const config = require('../config');

function seedAdmin() {
  const passwordHash = bcrypt.hashSync(config.ADMIN_PASSWORD, 10);

  // UPSERT：不存在则创建；已存在则强制同步密码/角色/状态（不覆盖用户自定义的昵称/头像）
  const info = db
    .prepare(
      `INSERT INTO users (email, password_hash, role, status, location, nickname, avatar)
       VALUES (?, ?, 'admin', 'active', ?, 'xiaopac', '🛡')
       ON CONFLICT(email) DO UPDATE SET
         role = 'admin',
         status = 'active',
         password_hash = excluded.password_hash`,
    )
    .run(config.ADMIN_USERNAME, passwordHash, '系统管理员');

  // 补默认昵称/头像（仅当为空）
  db.prepare("UPDATE users SET nickname = 'xiaopac' WHERE email = ? AND nickname IS NULL").run(config.ADMIN_USERNAME);
  db.prepare("UPDATE users SET avatar = '🛡' WHERE email = ? AND avatar IS NULL").run(config.ADMIN_USERNAME);

  if (info.changes > 0) {
    console.log(`[admin] 硬编码管理员 ${config.ADMIN_USERNAME} 已就绪（密码以 ADMIN_PASSWORD 为准）`);
  }

  if (config.ADMIN_PASSWORD === 'admin123') {
    console.warn('[admin] 正在使用默认管理员密码 admin123，请通过环境变量 ADMIN_PASSWORD 修改后重启');
  }
}

module.exports = { seedAdmin };
