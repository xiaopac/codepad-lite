#!/usr/bin/env bash
# CodePad Lite 服务器更新脚本（Git 方式，推荐）
# 用法（项目目录内）：sudo bash scripts/git-update.sh
set -e

if [ "$(id -u)" -ne 0 ]; then
  echo "请以 root 运行：sudo bash scripts/git-update.sh"
  exit 1
fi

cd "$(dirname "$0")/.."

echo "==> git pull ..."
git pull --ff-only

echo "==> 重新构建并启动（数据库结构变更会自动迁移）..."
docker compose up -d --build

echo "==> 清理旧镜像 ..."
docker image prune -f >/dev/null 2>&1 || true

echo ""
echo "==> 更新完成！查看日志：docker compose logs -f backend"
