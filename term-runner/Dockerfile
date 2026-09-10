# CodePad Lite 交互式终端沙箱（term-runner）
# 独立于 Piston：每个会话 = 容器内一个 node-pty 伪终端进程。
# 安全设计：
#  - 容器只挂 internal 网络（进程无外网访问，见 docker-compose termnet）；
#  - 以非 root 用户运行；容器 no-new-privileges；
#  - 每会话 ulimit 限制虚拟内存与 CPU 时间，硬超时与空闲回收；
#  - 会话目录隔离在 /app/sessions（可执行文件系统），结束即删。
# 图形支持（pygame 弹窗兼容）：每会话一块 Xvfb 虚拟屏幕 + openbox 窗口管理器，
# 画面经 x11vnc 编码后由浏览器 noVNC 分窗显示。
FROM node:22-slim

# 管理员可通过 .env 的 APT_EXTRA_PACKAGES 追加系统级组件（如 python3-opencv ffmpeg python3-numpy），
# 追加后需重建本镜像：docker compose up -d --build term-runner
ARG APT_EXTRA_PACKAGES=""

# node-pty 编译工具 + 两种语言运行时 + 虚拟显示栈 + SDL2 图形库
# + Mesa 软件渲染（GLX 扩展）：pygame/SDL 建窗口需要 OpenGL 上下文，Xvfb 缺 GLX 会 X Error 退出
# + tkinter（python3-tk）与中文字体：图形界面程序用得到，pip 装不了，只能镜像内置
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip make g++ bash procps \
    python3-tk fonts-wqy-microhei \
    xvfb openbox x11vnc \
    libsdl2-2.0-0 libsdl2-image-2.0-0 libsdl2-mixer-2.0-0 libsdl2-ttf-2.0-0 \
    libgl1 libgl1-mesa-dri libglx-mesa0 \
    ${APT_EXTRA_PACKAGES} \
 && rm -rf /var/lib/apt/lists/* \
 && pip3 install --no-cache-dir --break-system-packages pygame

WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund

COPY server.js /app/server.js
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# 非 root 运行由 entrypoint 降权实现（需要 root 预建 /tmp/.X11-unix 供 Xvfb 使用）；
# /app/sessions 归 runner 所有（会话目录在可执行层，tmpfs 可能 noexec）
RUN useradd -m -u 10001 runner \
 && mkdir -p /app/sessions \
 && chown -R runner:runner /app

ENV PORT=4100
EXPOSE 4100
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server.js"]
