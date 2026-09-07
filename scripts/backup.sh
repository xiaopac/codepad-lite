#!/usr/bin/env bash
# CodePad Lite 备份脚本（Linux 服务器）：备份 db 与 storage 两个数据卷
# 用法：sudo bash scripts/backup.sh
set -e

cd "$(dirname "$0")/.."
STAMP=$(date +%Y%m%d-%H%M%S)
OUT="backup-$STAMP"
mkdir -p "$OUT"

echo "==> 备份数据卷到 $OUT ..."
docker run --rm -v codepad-lite_db_data:/data -v "$PWD/$OUT:/backup" alpine tar czf /backup/db.tar.gz /data
docker run --rm -v codepad-lite_storage_data:/data -v "$PWD/$OUT:/backup" alpine tar czf /backup/storage.tar.gz /data

echo ""
echo "==> 完成："
ls -lh "$OUT"
echo ""
echo "恢复（目标机）："
echo "  docker volume create codepad-lite_db_data codepad-lite_storage_data"
echo "  docker run --rm -v codepad-lite_db_data:/data -v \"\$PWD/$OUT:/backup\" alpine sh -c 'rm -rf /data/* && tar xzf /backup/db.tar.gz -C /'"
echo "  docker run --rm -v codepad-lite_storage_data:/data -v \"\$PWD/$OUT:/backup\" alpine sh -c 'rm -rf /data/* && tar xzf /backup/storage.tar.gz -C /'"
