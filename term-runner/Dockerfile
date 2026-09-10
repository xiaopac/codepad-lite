# CodePad Lite 交互式终端沙箱（term-runner）
# 独立于 Piston：每个会话 = 容器内一个 node-pty 伪终端进程。
# 安全设计：
#  - 容器只挂 internal 网络（进程无外网访问，见 docker-compose termnet）；
#  - 以非 root 用户运行；容器 no-new-privileges；
#  - 每会话 ulimit 限制虚拟内存与 CPU 时间，硬超时与空闲回收；
#  - 会话目录隔离在 /tmp/term-sessions/<id>，结束即删。
FROM node:22-slim

# node-pty 若无预编译二进制需要编译工具；同时安装两种语言的运行时
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ bash procps \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund

COPY server.js /app/server.js

# 非 root 运行；/app/sessions 归 runner 所有（会话目录在可执行层，tmpfs 可能 noexec）
RUN useradd -m -u 10001 runner \
 && mkdir -p /app/sessions \
 && chown -R runner:runner /app
USER runner

ENV PORT=4100
EXPOSE 4100
CMD ["node", "server.js"]
