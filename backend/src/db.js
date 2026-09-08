const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('./config');

fs.mkdirSync(path.dirname(config.DB_PATH), { recursive: true });

const db = new Database(config.DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ═══════════════ 用户表（新 Schema：邮箱 + 审计字段 + 三态） ═══════════════
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nickname TEXT,
  avatar TEXT,
  ip_address TEXT,
  location TEXT,
  user_agent TEXT,
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  registered_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// ═══════════════ 自动迁移：兼容旧版 username 表 ═══════════════
// 旧库：username → email；补充审计列；既有用户全部置 active，避免被审核机制锁死。
function migrateUsersTable() {
  db.transaction(() => {
    const cols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
    let touched = false;

    if (cols.includes('username') && !cols.includes('email')) {
      db.exec('ALTER TABLE users RENAME COLUMN username TO email');
      cols[cols.indexOf('username')] = 'email';
      touched = true;
      console.log('[db] 已迁移：users.username → users.email');
    }

    const additions = [
      ['ip_address', 'TEXT'],
      ['location', 'TEXT'],
      ['user_agent', 'TEXT'],
      ['role', "TEXT DEFAULT 'user'"],
      ['status', "TEXT DEFAULT 'pending'"],
      // 注意：ALTER TABLE ADD COLUMN 不允许 CURRENT_TIMESTAMP 这类非常量默认值，
      // 迁移路径不加默认值（旧用户 registered_at 为 NULL，前端回退显示 created_at）
      ['registered_at', 'DATETIME'],
      ['nickname', 'TEXT'],
      ['avatar', 'TEXT'],
    ];
    for (const [name, def] of additions) {
      if (!cols.includes(name)) {
        db.exec(`ALTER TABLE users ADD COLUMN ${name} ${def}`);
        touched = true;
      }
    }

    // 迁移产生的既有用户（ADD COLUMN 会回填 DEFAULT 值）统一放行为 active
    if (touched) {
      db.exec("UPDATE users SET status = 'active'");
      console.log('[db] 已迁移：既有用户全部置为 active');
    }

    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)');

    // 编辑器背景设置（JSON：{ scale, contrast, opacity, posX, posY }）
    if (!db.prepare('PRAGMA table_info(users)').all().some((c) => c.name === 'editor_background')) {
      db.exec('ALTER TABLE users ADD COLUMN editor_background TEXT');
    }
  })();
}
migrateUsersTable();

// ═══════════════ 其余表 ═══════════════
db.exec(`
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  language TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, name)
);

-- 执行日志（管理员后台审计用；用户删除后保留日志，user_id 置空）
CREATE TABLE IF NOT EXISTS execution_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  language TEXT NOT NULL,
  exit_code INTEGER,
  execution_time REAL,
  status TEXT NOT NULL,
  code_length INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_execution_logs_created ON execution_logs(created_at);

-- 用户自定义 Python 环境
CREATE TABLE IF NOT EXISTS environments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  python_version TEXT NOT NULL,
  packages TEXT NOT NULL,
  status TEXT DEFAULT 'building',
  error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, name)
);
`);

// 项目 ↔ 环境绑定（必须在 projects 表创建之后执行）
if (!db.prepare('PRAGMA table_info(projects)').all().some((c) => c.name === 'environment_id')) {
  db.exec('ALTER TABLE projects ADD COLUMN environment_id INTEGER');
}

// 构建日志列（自检机制：pip 输出分类后入库，前端可查看）
if (!db.prepare('PRAGMA table_info(environments)').all().some((c) => c.name === 'build_log')) {
  db.exec('ALTER TABLE environments ADD COLUMN build_log TEXT');
}

// 查询加速索引（需求 2.1）：外键与高频过滤列
db.exec(`
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_files_project ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_environments_user ON environments(user_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_user ON execution_logs(user_id);
`);

module.exports = db;
