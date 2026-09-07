# CodePad Lite env-builder 镜像
# 自检第一步：在安装任何依赖之前先升级 pip，消除“pip 版本过旧”警告；
# 该层内容稳定，可被 Docker 缓存复用，加速后续构建。
FROM python:3.11-slim

RUN pip install --no-cache-dir --upgrade pip

# 禁用 pip 版本检查通知 + 无缓冲输出（构建日志更干净，避免用户误判失败）
ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
COPY server.py /app/server.py

EXPOSE 3100
CMD ["python", "-u", "server.py"]
