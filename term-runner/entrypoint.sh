#!/bin/sh
# 以 root 启动：预建 X11 socket 目录（tmpfs 每次重启为空），随后降权到 runner 运行服务
mkdir -p /tmp/.X11-unix
chown root:root /tmp/.X11-unix
chmod 1777 /tmp/.X11-unix
exec setpriv --reuid=runner --regid=runner --init-groups -- node /app/server.js
