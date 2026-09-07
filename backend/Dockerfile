# CodePad Lite 后端镜像
FROM node:22-alpine

# better-sqlite3 若无对应平台预编译二进制，需要以下工具从源码编译
RUN apk add --no-cache --virtual .build-deps python3 make g++

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

RUN apk del .build-deps

COPY . .

RUN mkdir -p /app/data /app/storage && chown -R node:node /app
USER node

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "src/server.js"]
