#!/usr/bin/env bash
# CodePad Lite 服务器一键初始化（首次部署运行一次）
# 用法：解压项目后，在项目目录执行
#   sudo bash scripts/server-setup.sh
set -e

if [ "$(id -u)" -ne 0 ]; then
  echo "请以 root 运行：sudo bash scripts/server-setup.sh"
  exit 1
fi

cd "$(dirname "$0")/.."

# 网页端口：与 docker-compose 的 WEB_PORT 默认值保持一致（.env 里可覆盖）
WEB_PORT="${WEB_PORT:-8081}"

# ── 1. 安装 Docker Engine + Compose v2（已安装则跳过） ──
if ! command -v docker >/dev/null 2>&1; then
  echo "==> 安装 Docker Engine + Compose v2 ..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
else
  echo "==> Docker 已安装：$(docker --version)"
fi
docker compose version >/dev/null 2>&1 || { echo "缺少 compose 插件，请重新安装 Docker"; exit 1; }

# ── 2. 防火墙：只开放 SSH 与 Web 端口 ──
if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH >/dev/null 2>&1 || true
  ufw allow 80,443/tcp >/dev/null 2>&1 || true
  ufw --force enable
  echo "==> 防火墙已配置（仅开放 22 / 80 / 443）"
else
  echo "==> 未检测到 ufw，请自行在云厂商安全组放行 80/443（${WEB_PORT}/2000/3001 不要放行）"
fi

# ── 3. 生成 .env（随机强密钥；管理员密码请记下，也可之后手动修改） ──
if [ ! -f .env ]; then
  JWT=$(openssl rand -hex 32)
  ADMIN_PW=$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-16)
  cat > .env <<EOF
JWT_SECRET=${JWT}
ADMIN_PASSWORD=${ADMIN_PW}
EOF
  echo "==> 已生成 .env"
  echo "    ─────────────────────────────────────"
  echo "    管理员账号：xiaopac"
  echo "    管理员密码：${ADMIN_PW}   ← 请立即记下！"
  echo "    （想换密码：编辑 .env 的 ADMIN_PASSWORD 后 docker compose up -d backend 即可）"
  echo "    ─────────────────────────────────────"
else
  echo "==> .env 已存在，跳过生成（如需重置管理员密码请编辑该文件）"
fi

# ── 4. 构建并启动 ──
echo "==> 构建并启动服务（首次拉取镜像 + 安装运行时会比较久）..."
docker compose up -d --build

IP=$(hostname -I 2>/dev/null | awk '{print $1}')
echo ""
echo "==> 部署完成！"
echo "    访问地址：http://${IP:-服务器IP}:${WEB_PORT}"
echo "    查看日志：docker compose logs -f backend"
echo "    首次启动 piston 需 1-2 分钟自动安装 cpp/python 运行时，稍后即可执行代码"
