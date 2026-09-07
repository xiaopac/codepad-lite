# CodePad Lite 后端镜像（多阶段：构建依赖层与运行层分离，最终镜像更小）
FROM node:22-alpine

# better-sqlite3 若无对应平台预编译二进制，需要以下工具从源码编译（装完即删，不残留到运行层）
RUN apk add --no-cache --virtual .build-deps python3 make g++

WORKDIR /app

# 依赖层：package*.json 不变时可复用缓存
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund \
 && npm cache clean --force

RUN apk del .build-deps

# 代码层：每次更新仅重建此层
COPY . .

RUN mkdir -p /app/data /app/storage /app/logs && chown -R node:node /app
USER node

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "src/server.js"]
