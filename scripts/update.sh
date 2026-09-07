#!/usr/bin/env bash
# CodePad Lite 服务器更新脚本（本机打包 → 上传 → 服务器执行本脚本）
# 用法（在项目目录执行）：
#   sudo bash scripts/update.sh [压缩包路径]
# 默认查找当前目录下的 codepad-lite-release.tar.gz
set -e

if [ "$(id -u)" -ne 0 ]; then
  echo "请以 root 运行：sudo bash scripts/update.sh"
  exit 1
fi

cd "$(dirname "$0")/.."

ARCHIVE="${1:-codepad-lite-release.tar.gz}"
if [ ! -f "$ARCHIVE" ]; then
  echo "找不到更新包：$ARCHIVE"
  echo "请先在本机执行 scripts/package.ps1 打包，再 scp 到本目录"
  exit 1
fi

echo "==> 解压 $ARCHIVE 覆盖项目文件（.env 与数据卷不受影响）..."
tar -xzf "$ARCHIVE" -C .. --exclude='codepad-lite/.env'

echo "==> 重新构建并启动（数据库结构有变化会自动迁移）..."
docker compose up -d --build

echo "==> 清理旧镜像 ..."
docker image prune -f >/dev/null 2>&1 || true

echo ""
echo "==> 更新完成！查看日志：docker compose logs -f backend"
