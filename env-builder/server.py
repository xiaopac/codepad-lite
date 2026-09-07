#!/usr/bin/env python3
# CodePad Lite env-builder：把第三方 pip 包安装进 Piston 共享卷的 site-packages。
# 说明：Piston 每次执行任务都会复制整个运行时目录，因此写入共享卷的包对所有
# 后续执行持久生效。构建器与 Piston 同为 glibc（Debian），使用 manylinux 轮子。
import json
import os
import re
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

PKGS_ROOT = '/pkgs'
PORT = int(os.environ.get('PORT', '3100'))
INDEX_URL = os.environ.get('PIP_INDEX_URL', 'https://pypi.org/simple')
VER_RE = re.compile(r'^3\.(9|10|11)$')
PKG_RE = re.compile(r'^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$')
BUILD_TIMEOUT = 280


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def _reply(self, code, data):
        payload = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        if self.path == '/health':
            return self._reply(200, {'ok': True, 'python': sys.version.split()[0]})
        self._reply(404, {'error': 'not found'})

    def do_POST(self):
        if self.path != '/build':
            return self._reply(404, {'error': 'not found'})
        try:
            length = int(self.headers.get('Content-Length', 0) or 0)
            body = json.loads(self.rfile.read(length) or b'{}')
        except (ValueError, json.JSONDecodeError):
            return self._reply(400, {'error': 'invalid json'})

        version = str(body.get('python_version', ''))
        packages = body.get('packages') or []
        target = str(body.get('target', ''))

        if not VER_RE.match(version):
            return self._reply(400, {'error': 'invalid python_version'})
        if not isinstance(packages, list) or not (1 <= len(packages) <= 50):
            return self._reply(400, {'error': 'packages must be 1-50 names'})
        for p in packages:
            if not PKG_RE.match(p):
                return self._reply(400, {'error': 'invalid package name: ' + p})

        # 路径安全：必须落在 /pkgs/python/<version>/lib/python<X.Y>/site-packages
        python_root = os.path.realpath(os.path.join(PKGS_ROOT, 'python'))
        real = os.path.realpath(target)
        if not real.startswith(python_root + os.sep):
            return self._reply(400, {'error': 'target outside /pkgs/python'})
        if not real.endswith(os.path.join('lib', 'python' + version, 'site-packages')):
            return self._reply(400, {'error': 'target must be the runtime site-packages'})

        os.makedirs(real, exist_ok=True)
        cmd = [
            sys.executable, '-m', 'pip', 'install', '--no-cache-dir',
            '--index-url', INDEX_URL,
            '--target', real,
            '--python-version', version,
            '--only-binary=:all:',
            *packages,
        ]
        print(f'[build] python {version}: pip install {" ".join(packages)}', flush=True)
        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=BUILD_TIMEOUT)
        except subprocess.TimeoutExpired:
            return self._reply(500, {'error': f'build timeout ({BUILD_TIMEOUT}s)'})
        if proc.returncode != 0:
            tail = (proc.stderr or proc.stdout or '').strip().splitlines()[-3:]
            print(f'[build] FAILED: {" | ".join(tail)}', flush=True)
            return self._reply(500, {'error': 'pip 安装失败：' + ' | '.join(tail)})
        print(f'[build] OK: {", ".join(packages)}', flush=True)
        self._reply(200, {'success': True, 'installed': packages})


if __name__ == '__main__':
    print(f'env-builder listening on 0.0.0.0:{PORT} (index: {INDEX_URL})', flush=True)
    HTTPServer(('0.0.0.0', PORT), Handler).serve_forever()
