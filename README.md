# ⚡ CodePad Lite

轻量级在线编译环境 —— 面向 **iPad 学生与开发者**，随时随地编写、编译和运行 **C / C++ / Python** 代码。

- **轻量化**：单后端服务 + SQLite，无重量级中间件
- **移动优先**：44pt+ 触控按钮、软键盘自适应、触摸友好的 Monaco 编辑器
- **工作区体验**：项目（文件夹）→ 多文件，类 VS Code 组织方式
- **自带账号**：JWT 无状态认证（7 天），无需第三方登录

---

## 架构

```
┌────────────┐   /api (nginx 反代)   ┌────────────┐  HTTP /api/v2/execute  ┌────────────┐
│  frontend   │ ───────────────────▶ │  backend    │ ────────────────────▶ │   piston    │
│ nginx+React │                      │ Express     │                        │  (Docker)   │
│   :8080     │                      │ SQLite+JWT  │                        │   :2000     │
└────────────┘                      └─────┬──────┘                        └────────────┘
                                          │ 文件内容
                                          ▼
                            ./storage/users/{userId}/projects/{projectId}/
                            （数据库仅存元数据 + 路径映射）
```

三个 Docker Compose 服务：`frontend`、`backend`、`piston`。

---

## 快速开始（Docker Compose）

```bash
cd codepad-lite

# 1. 复制环境变量示例并修改 JWT_SECRET
cp .env.example .env        # Windows: copy .env.example .env

# 2. 一键构建并启动
docker compose up -d --build

# 3. 打开浏览器（iPad 也可直接访问宿主机 IP）
#    http://localhost:8080
```

> **关于 ```bash**：`bash` 只是 Markdown 代码块的语法高亮标记，**不是要求 Git Bash**。
> Windows 下用自带的 **PowerShell** 或 **CMD** 执行即可（`docker compose` 由 Docker Desktop
> 提供，任何终端都能调用），只需把 `cp` 换成 `copy`：

```powershell
cd codepad-lite
copy .env.example .env      # 然后编辑 .env，修改 JWT_SECRET
docker compose up -d --build
```

浏览器打开 http://localhost:8080（iPad 访问宿主机 IP 即可）。

> **首次启动说明**：piston 容器就绪后，后端会自动调用其包管理 API 安装
> `cpp` / `python` 运行时（约 1-2 分钟，下载工具链）。首次点击「▶ 运行」
> 若提示“正在后台自动安装”，稍等片刻重试即可。
> 观察进度：`docker compose logs -f backend | grep piston`
> （Windows PowerShell 把 `grep piston` 换成 `Select-String piston`）
>
> **管理员账号**：首次启动自动创建硬编码管理员 `xiaopac`（密码取自
> `ADMIN_PASSWORD`，默认 `admin123`，生产务必在 `.env` 中修改）。
> 新注册的邮箱账号一律进入待审核状态，需用 `xiaopac` 登录后在
> 「🛡 管理后台 → 用户管理」中通过审核方可使用。

数据持久化在三个命名卷中：`db_data`（SQLite）、`storage_data`（代码文件）、
`piston_packages`（语言运行时）。

---

## 本地开发（不使用 Docker 运行前后端）

前置要求：Node.js ≥ 22.12（Vite 8 要求）、本机或远程运行一个 Piston 实例。

```bash
# 终端 1：后端（默认 http://localhost:3001）
cd backend
npm install
npm run dev          # node --watch，改动自动重启

# 终端 2：前端（默认 http://localhost:5173，已配置 /api 代理到 3001）
cd frontend
npm install
npm run dev
```

若 Piston 不在本机 2000 端口，设置环境变量：

```bash
# PowerShell
$env:PISTON_URL = "http://192.168.1.100:2000"; npm run dev
# bash
PISTON_URL=http://192.168.1.100:2000 npm run dev
```

仅本地开发后端时也可以只启动 piston 一个容器：

```bash
docker compose up -d piston
```

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `JWT_SECRET` | 开发默认值 | **生产必须修改**，JWT 签名密钥 |
| `ADMIN_PASSWORD` | `admin123` | 硬编码管理员 `xiaopac` 的初始密码（仅首次创建时生效） |
| `PORT` | `3001` | 后端监听端口 |
| `DB_PATH` | `./data/codepad.db` | SQLite 数据库文件路径 |
| `STORAGE_DIR` | `./storage` | 代码文件存储根目录 |
| `PISTON_URL` | `http://localhost:2000` | Piston 服务地址 |
| `COMPILE_TIMEOUT_MS` | `10000` | 编译超时（毫秒） |
| `RUN_TIMEOUT_MS` | `10000` | 运行超时（毫秒，需求锁定 10 秒） |
| `GEO_LOOKUP_ENABLED` | `true` | 注册时 IP 归属地查询开关（依赖外部免费接口，失败自动降级） |

前端：`VITE_API_BASE` 可覆盖 API 前缀（默认同源 `/api`）。

---

## 企业治理：账号审核与管理员后台

- **仅邮箱注册**：注册即进入 `pending`（待审核），并自动采集数字指纹（IP / 归属地 / User-Agent）；登录时三态闸门拦截（待审核 / 已拒绝均无法登录）。
- **硬编码管理员 `xiaopac`**：首次启动自动创建（密码取自 `ADMIN_PASSWORD`，默认 `admin123`，**生产务必修改**）；每次启动自愈为 `admin/active`，登录后项目列表页出现「🛡 管理后台」入口。
- **管理后台**（仅管理员可见）：
  - **用户管理**：三态徽章（待审核/已激活/已拒绝）+ 注册指纹展示，一键通过 / 拒绝 / 重新激活 / 封禁（管理员账号不可被修改）；
  - **系统监控**：进程/系统运行时长、内存占用、CPU 负载、数据库体积、Piston 在线状态与已装运行时、资源统计（15 秒自动刷新）；
  - **执行日志**：最近 100 次代码执行的审计记录（用户、语言、退出码、耗时、状态分类：成功/编译错误/运行错误/超时/引擎错误）。
- **数据迁移**：旧库自动升级（`username` → `email`），既有用户全部置为 `active`，不会被审核机制锁死。

---

## API 契约

所有接口前缀 `/api`。除注册/登录外均需请求头 `Authorization: Bearer <token>`。

| 端点 | 方法 | 请求体 | 响应 | 说明 |
|------|------|--------|------|------|
| `/api/auth/register` | POST | `{ email, password }` | `{ success, user }` | 邮箱注册（bcrypt 加密，进入待审核） |
| `/api/auth/login` | POST | `{ email, password }` | `{ token, user }` | 登录（JWT，7 天；三态闸门） |
| `/api/user/me` | GET | — | `{ user }` | 获取当前用户信息 |
| `/api/projects` | GET | — | `{ projects: [{id, name, created_at}] }` | 项目列表 |
| `/api/projects` | POST | `{ name }` | `{ project }` | 创建项目 |
| `/api/projects/:id` | DELETE | — | `{ success }` | 删除项目（级联删除文件） |
| `/api/projects/:id/files` | GET | — | `{ files: [{id, name, content, language}] }` | 文件列表及内容 |
| `/api/projects/:id/files` | POST | `{ name, content }` | `{ file }` | 新增文件 |
| `/api/projects/:id/files/:fileId` | PUT | `{ content }` | `{ file }` | 更新文件内容（自动保存） |
| `/api/projects/:id/files/:fileId` | PATCH | `{ name }` | `{ file }` | 重命名文件（契约表外的补充端点） |
| `/api/projects/:id/files/:fileId` | DELETE | — | `{ success }` | 删除文件 |
| `/api/execute` | POST | `{ language: "c"\|"cpp"\|"python", code, stdin }` | `{ stdout, stderr, compile_error, execution_time, exit_code }` | 执行代码（需鉴权，写入执行日志） |
| `/api/environments` | GET | — | `{ environments: [...] }` | 环境列表（含 build_log / build_command_custom） |
| `/api/environments` | POST | `{ name, python_version, packages, build_command? }` | `{ environment }` | 创建环境并异步构建（高级模式：自定义 pip 参数，白名单校验） |
| `/api/environments/:id` | PUT | `{ name, packages?, build_command? }` | `{ environment }` | 编辑环境并自动重建 |
| `/api/environments/:id/rebuild` | POST | — | `{ environment }` | 重新构建 |
| `/api/admin/users` | GET | — | `{ users: [...] }` | 【管理员】用户列表（含注册指纹） |
| `/api/admin/users/:id/approve` | POST | — | `{ success, user }` | 【管理员】通过审核 / 重新激活 |
| `/api/admin/users/:id/reject` | POST | — | `{ success, user }` | 【管理员】拒绝 / 封禁 |
| `/api/admin/stats` | GET | — | `{ counts }` | 【管理员】资源统计 |
| `/api/admin/monitor` | GET | — | `{ uptime, memory, os, db, piston }` | 【管理员】系统监控快照 |
| `/api/admin/logs` | GET | — | `{ logs }` | 【管理员】执行日志（最近 100 条） |

文件名约束：`main.c` / `main.cpp` / `main.py` 形式（文本文件 `.c`/`.cpp`/`.py`/`.txt`，扩展名决定语言；图片/音视频走「上传文件」）。

---

## 目录结构

```
codepad-lite/
├── docker-compose.yml          # 统一编排：frontend / backend / piston
├── .env.example
├── backend/
│   ├── Dockerfile
│   └── src/
│       ├── server.js           # 入口（express-async-errors）
│       ├── app.js              # Express 装配
│       ├── config.js           # 环境变量
│       ├── db.js               # SQLite schema（users/projects/files）
│       ├── middleware/         # JWT 鉴权、统一错误处理
│       ├── routes/             # auth / user / projects / execute
│       ├── services/
│       │   ├── fileStore.js    # 磁盘文件读写（storage/users/{uid}/projects/{pid}/）
│       │   └── piston.js       # Piston 客户端 + 运行时自动安装
│       └── utils/              # HttpError、扩展名→语言
├── frontend/
│   ├── Dockerfile              # 多阶段构建，nginx 托管 + /api 反代
│   ├── nginx.conf
│   └── src/
│       ├── monacoSetup.js      # Monaco 本地打包 + worker 配置
│       ├── api/client.js       # fetch 封装（自动带 token、401 自动登出）
│       ├── store/              # Zustand：auth / project / editor / ui
│       ├── hooks/useVisualViewport.js  # iPad 软键盘高度适配
│       └── components/         # AuthPage / ProjectListView / Workspace
│                               # Toolbar / FileSidebar / EditorPane / OutputPanel
└── README.md
```

---

## 关键实现细节

### 移动端适配（iPad）
- **软键盘防遮挡**：`visualViewport` 高度写入 CSS 变量 `--app-height`，应用根容器随之
  收缩；Monaco 开启 `automaticLayout` 自动重排。
- **触摸换行**：`editor.wrappingStrategy: "advanced"` + `wordWrap: "on"`（需求锁定）。
- **字号**：默认 `16px`，工具栏 `A− / A＋` 调节（12–24px）。
- **触控目标**：所有交互按钮 ≥ 44px（Tailwind `h-11` / `h-12`），输出面板支持
  触摸拖拽调整高度、两段式确认删除（避免误触）。
- **快捷键**：iPad 外接键盘 `⌘+Enter` 运行、`⌘+S` 保存。

### 自动保存（防 iPad 意外关闭）
1. 输入停顿 **2 秒** → 防抖保存；
2. **切换文件 / 退出项目** → 先保存再切换；
3. **窗口失焦 / 切后台 / 页面关闭** → `keepalive` 请求兜底保存。
所有保存请求通过队列串行化，避免竞态；失败时顶部出现黄色提示条。

### 代码执行
- 后端把 `{language, code, stdin}` 转发到 Piston `/api/v2/execute`，编译/运行超时均
  为 **10 秒**；
- 输出映射：`stdout` / `stderr`（红色）/ `compile_error`（编译失败红块）/
  `execution_time`（Piston 的 `wall_time`，缺失时回退为后端实测耗时）/
  `exit_code`（超时被杀显示 137，并附带提示）；
- **运行时自动安装**：后端启动后探测 `/api/v2/runtimes`，缺失的 c/cpp/python 会通过
  `/api/v2/packages` 自动安装，`docker compose up` 后无需手工步骤。

### 安全（生产加固）
- 密码 bcrypt（cost 10）+ 复杂度强制（≥8 位含大小写+数字）；JWT HS256、7 天，每次请求实时校验账号状态；
- **限流防爆破**：全局 120 次/分/IP，登录注册 20 次/分/IP，代码执行 10 次/分/用户（RateLimit 响应头）；
- **统一参数校验**（express-validator）：邮箱/密码/项目名/文件名/库名全部白名单校验，路径穿越与命令注入双重防护（正则 + path.resolve 越界检查）；
- **安全响应头**：CSP（script-src 'self'，样式允许 inline 供 Monaco）、helmet（nosniff/frame/HSTS 等）、CORS 默认同源（白名单可配）；
- **上传安全**：背景图 MIME 白名单 + 魔数嗅探（真实类型必须与声明一致）+ 2.5MB 上限；
- **错误信息脱敏**：生产响应不含堆栈；winston 日志按日轮转保留 30 天，邮箱等敏感信息脱敏记录；
- 执行并发上限 5、超时 10s、Piston 沙箱默认禁网；代码 ≤ 200KB、stdin ≤ 100KB；
- 容器健康检查（healthcheck）+ 资源限额（内存上限）+ 数据卷备份脚本（`scripts/backup.ps1|sh`）。

---

## 服务器部署（Linux VPS）

### 1. 服务器准备

```bash
# Ubuntu/Debian：安装 Docker Engine + Compose v2 插件
curl -fsSL https://get.docker.com | sudo sh

# 防火墙：只开 SSH 与 Web 端口（piston/backend 端口一律不对外开放）
sudo ufw allow OpenSSH
sudo ufw allow 80,443/tcp
sudo ufw enable
```

### 2. 上传项目：GitHub 私库（推荐）

**本机（一次性，项目已初始化 git 仓库）**：在 GitHub 网页新建一个 **Private** 空仓库
（不要勾选 README/.gitignore），然后：

```bash
git remote add origin https://github.com/你的用户名/codepad-lite.git
git push -u origin main
```

**服务器**（推荐 SSH 部署密钥，免密且安全）：

```bash
# 生成专用密钥
ssh-keygen -t ed25519 -N "" -f ~/.ssh/codepad_deploy
cat ~/.ssh/codepad_deploy.pub
# ↑ 把输出贴到 GitHub 仓库 Settings → Deploy keys → Add deploy key（只读即可）

# 让 GitHub 走这把密钥
cat >> ~/.ssh/config <<'EOF'
Host github.com
  IdentityFile ~/.ssh/codepad_deploy
  IdentitiesOnly yes
EOF

# 克隆
cd /root
git clone git@github.com:你的用户名/codepad-lite.git
cd codepad-lite
```

不想配密钥的话，用 HTTPS + Personal Access Token 克隆：

```bash
git clone https://<你的Token>@github.com/你的用户名/codepad-lite.git
```

> 国内服务器访问 GitHub 慢/不通：把仓库同步到 Gitee 私库，服务器改从 Gitee 克隆，流程完全一样。

（压缩包方式备选：`scripts\package.ps1` 打包 + scp 上传 + `sudo bash scripts/update.sh` 更新）

### 3. 配置环境变量并启动

```bash
cp .env.example .env
# 编辑 .env：JWT_SECRET 与 ADMIN_PASSWORD 务必改为强随机值
#   JWT_SECRET=$(openssl rand -hex 32)
#   ADMIN_PASSWORD=你选择的强密码

docker compose up -d --build
# 观察启动日志（首次会自动安装 piston 的 c/cpp/python 运行时，约 1-2 分钟）
docker compose logs -f backend
```

访问 `http://服务器IP:8080`，用 `xiaopac` + 你设置的 `ADMIN_PASSWORD` 登录。

### 4. 数据迁移（可选：把本机的账号/代码搬到服务器）

本机打包（Windows PowerShell）：

```powershell
docker run --rm -v codepad-lite_db_data:/data -v ${PWD}:/backup alpine tar czf /backup/codepad-db.tar.gz /data
docker run --rm -v codepad-lite_storage_data:/data -v ${PWD}:/backup alpine tar czf /backup/codepad-storage.tar.gz /data
docker run --rm -v codepad-lite_piston_packages:/data -v ${PWD}:/backup alpine tar czf /backup/codepad-piston.tar.gz /data
scp codepad-*.tar.gz user@服务器IP:~/
```

服务器恢复（在 `docker compose up` 之前执行）：

```bash
docker volume create codepad-lite_db_data codepad-lite_storage_data codepad-lite_piston_packages
for v in db storage piston; do
  docker run --rm -v codepad-lite_${v}_data:/data -v $PWD:/backup alpine \
    sh -c "rm -rf /data/* && tar xzf /backup/codepad-${v}.tar.gz -C /"
done
```

> 不想搬数据就直接跳过本步——新服务器会是全新空库，重新注册即可（管理员 xiaopac 自动创建）。

### 5. HTTPS（强烈建议，密码/JWT 不应明文过网）

有域名时最简单的方式：宿主机装 Caddy（自动申请 Let's Encrypt 证书）：

```bash
sudo apt install -y caddy
# /etc/caddy/Caddyfile 内容：
#   code.example.com {
#       reverse_proxy localhost:8080
#   }
sudo systemctl reload caddy
```

没有域名：可改用 Cloudflare Tunnel，或接受 HTTP 仅限内网使用。
开启 HTTPS 后建议把防火墙的 80 关掉、8080 不对外开放（本 compose 只映射 8080，
由 Caddy 转发）。

### 6. 日常运维

```bash
docker compose logs -f backend          # 看日志
docker compose up -d --build            # 代码更新后重新构建
docker compose down                     # 停止（数据在命名卷中，不丢失）
```

备份（数据库 + 代码文件两个卷即可，piston 卷可重装）：

```bash
docker run --rm -v codepad-lite_db_data:/data -v $PWD:/backup alpine tar czf /backup/db-$(date +%F).tar.gz /data
docker run --rm -v codepad-lite_storage_data:/data -v $PWD:/backup alpine tar czf /backup/storage-$(date +%F).tar.gz /data
```

### 7. 服务器部署注意点

- **Piston 端口已绑定 127.0.0.1**（本 compose 默认）：沙箱引擎绝不能公网暴露；
- **privileged 容器**：Piston 官方要求（isolate 沙箱），仅建议自用服务器运行；
- **国内服务器网络**：若 `ghcr.io` 拉取或 piston 运行时下载（GitHub Releases）失败，
  可在服务器上配置 Docker 镜像加速 / 代理，或本机 `docker save` 三个镜像后上传 `docker load`；
- **首次运行时机**：piston 首次启动会下载 c/cpp/python 工具链（约 1-2 分钟），
  此期间执行接口会返回"正在后台自动安装"提示；
- **系统要求**：内存 ≥ 2GB（推荐 4GB）、磁盘空闲 ≥ 5GB（piston 运行时约 1-2GB）。

**2GB 内存服务器（Ubuntu）必做：先建 swap 兜底**（编译峰值时防 OOM）：

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

**海外服务器（美西/硅谷等）**：GitHub / Docker Hub / PyPI 均直连畅通，
克隆直接用 GitHub 主仓库，无需 Gitee；pip 源保持默认即可。

### 8. 一键脚本与后续更新（Git 流程，推荐）

项目内置脚本：

- **服务器初始化**（克隆后执行一次）：`sudo bash scripts/server-setup.sh`
  → 安装 Docker、配置防火墙、随机生成 `JWT_SECRET` 与管理员密码、构建启动；
- **服务器更新**（Git 方式）：`sudo bash scripts/git-update.sh`
  → `git pull` + 重新构建 + 清理旧镜像（`.env` 与数据卷不受影响）；
- **服务器更新**（压缩包方式备选）：`sudo bash scripts/update.sh`；
- **本机打包**（压缩包方式用）：`powershell -ExecutionPolicy Bypass -File scripts\package.ps1`。

**发布节奏（Git）**：本机改代码 → 本机 `docker compose up -d --build` 验证 →
`git add -A && git commit -m "..." && git push` → 服务器 `sudo bash scripts/git-update.sh`。
数据库结构变更会在后端启动时自动迁移，无需手工干预。
仓库已通过 `.gitattributes` 强制 LF 行尾，服务器拉取的脚本开箱即用。

---

## Windows Server 部署

Windows 服务器（Windows Server 2022 / Win10/11 专业版，需 WSL2 或 Hyper-V）
全程远程桌面操作，与本地 Windows 流程一致：

```powershell
# 1. 安装 Docker Desktop（WSL2 后端）与 Git（管理员 PowerShell 执行）
winget install -e --id Docker.DockerDesktop
winget install -e --id Git.Git

# 2. 启动 Docker Desktop（等待右下角鲸鱼图标就绪），然后克隆公开仓库
cd C:\
git clone https://github.com/xiaopac/codepad-lite.git
cd codepad-lite
# 3. 一键初始化（生成随机密钥 + 构建启动）
powershell -ExecutionPolicy Bypass -File scripts\server-setup.ps1

# 4. 放行防火墙端口（管理员 PowerShell；云服务器还需在安全组放行 8080）
netsh advfirewall firewall add rule name="CodePad-8080" dir=in action=allow protocol=TCP localport=8080
```

访问 `http://服务器IP:8080`，用脚本打印的 `xiaopac` 密码登录。

> 国内服务器连不上 GitHub（报 `curl 28 ... Could not connect`）时改用 Gitee 克隆，
> 见文末「故障排查 → 服务器连不上 GitHub」。

**后续更新**：本机推送后，服务器上执行

```powershell
cd C:\codepad-lite
powershell -ExecutionPolicy Bypass -File scripts\git-update.ps1
```

> Docker Desktop 许可注意：免费版适用于个人/小企业（<250 员工且年营收 <1000 万美元），
> 规模更大需购买订阅。

---

## 故障排查

**服务器连不上 GitHub（`curl 28 / Could not connect to server`）**

国内服务器直连 GitHub 常被墙。推荐改用 Gitee（码云）同步仓库：

1. 在 gitee.com 新建同名空仓库（不要初始化 README）；
2. 本机（能连 GitHub 的机器）把代码推到 Gitee：

```powershell
cd I:\PYcoding\codepad-lite
git remote add gitee https://gitee.com/你的用户名/codepad-lite.git
git push gitee main
```

3. 服务器改从 Gitee 克隆：

```powershell
git clone https://gitee.com/你的用户名/codepad-lite.git
```

4. 之后本机每次更新推送两条：`git push origin main; git push gitee main`；
   服务器 `git-update.ps1` 直接从 Gitee 拉取（origin 即 Gitee，无需改动）。

备选方案：

- GitHub 镜像代理（第三方，时效性不稳定）：`git clone https://ghproxy.com/https://github.com/xiaopac/codepad-lite.git`
- hosts 指定可用 IP（先 `nslookup github.com` 看是否 DNS 污染，找到可用 IP 写入
  `C:\Windows\System32\drivers\etc\hosts`，IP 会轮换，需不定期更新）；
- 服务器上有代理时给 git 配置：`git config --global http.proxy http://127.0.0.1:端口`。

**国内服务器拉镜像 / 下载运行时失败**

三个下载环节在国内都可能受阻：ghcr.io 的 piston 镜像、Docker Hub 的 node/nginx
镜像、piston 的 c/cpp/python 运行时（GitHub Releases）。

- **有代理（最省事）**：Docker Desktop → Settings → Resources → Proxies → Manual，
  填入你的代理地址——镜像拉取、容器内下载全部走代理；
- **无代理**：Docker Desktop → Settings → Docker Engine 配置 `registry-mirrors`
  （阿里云/daocloud 加速器）解决 Docker Hub；piston 运行时在 `.env` 中加：
  `PISTON_REPO_URL=https://ghproxy.com/https://github.com/engineer-man/piston/releases/download/pkgs/index`；
  或把本机 `codepad-lite_piston_packages` 卷打包拷到服务器恢复（见数据迁移一节）。

**Piston 运行时一直装不上**

后端会自动重试安装（不设时限），先观察日志：

```bash
docker compose logs -f backend | grep piston            # Linux/macOS
docker compose logs -f backend | Select-String piston   # Windows PowerShell
```

如果确认 Piston 服务本身正常但安装迟迟不开始，可用其 HTTP API 手动安装
（你日志中的 `package: Installing xxx` 就是后端调用这个接口产生的，已验证可用）：

```bash
# 1. 查询 cpp 可安装的版本（记下 language_version）
curl http://localhost:2000/api/v2/packages

# 2. 用查到的版本安装（示例 10.2.0）
curl -X POST http://localhost:2000/api/v2/packages \
  -H "Content-Type: application/json" \
  -d '{"language":"cpp","version":"10.2.0"}'
```

Windows PowerShell 等价命令：

```powershell
Invoke-RestMethod http://localhost:2000/api/v2/packages | Where-Object language -eq cpp
Invoke-RestMethod http://localhost:2000/api/v2/packages -Method Post -ContentType 'application/json' -Body '{"language":"cpp","version":"10.2.0"}'
```

手动安装完成后重启后端即可生效：`docker compose restart backend`

**运行提示“Piston 不可用”**：确认 `docker compose ps` 中 piston 为 running，
并确认后端 `PISTON_URL` 能连通（compose 网络内为 `http://piston:2000`）。

**想解除 piston 的 privileged 模式**：可以在 `docker-compose.yml` 中移除
`privileged: true`（Piston 会退化为无隔离执行，安全性下降，不建议对公网开放）。

**输出被截断**：Piston 默认 stdout 上限仅 1024 字符，本项目已在 compose 中通过
`PISTON_OUTPUT_MAX_SIZE=100000` 放宽；如仍需更大可自行调整。

**端口冲突**：前端 `8080`、后端 `3001`、Piston `2000`，可在 compose 中修改映射。

---

## License

MIT
