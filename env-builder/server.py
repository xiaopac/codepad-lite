#!/usr/bin/env python3
# CodePad Lite env-builder：把第三方 pip 包安装进 Piston 共享卷的 site-packages。
# 健壮性自检：
#  - pip 已在镜像构建时升级到最新（见 Dockerfile），并禁用版本检查通知；
#  - 构建输出按 ERROR / WARNING / notice 分类：只有真正的 ERROR 才算失败，
#    警告与提示不会导致误判；
#  - 完整构建日志随响应返回（并写入数据库），供前端展示。
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
LOG_MAX_LINES = 200

# 内存态日志（最近的构建），供 GET /log/<id> 查询
RECENT_LOGS = {}
_LOG_SEQ = [0]


def classify(lines):
    """把 pip 输出分成 错误 / 警告 / 通知 三类。"""
    errors, warnings, notices = [], [], []
    for raw in lines:
        s = raw.strip()
        if not s:
            continue
        if s.startswith('ERROR') or 'ERROR:' in s:
            errors.append(s)
        elif s.startswith('WARNING') or '[notice]' in s:
            if '[notice]' in s:
                notices.append(s)
            else:
                warnings.append(s)
    return errors, warnings, notices


def run_pip(version, target, packages, log_id):
    cmd = [
        sys.executable, '-m', 'pip', 'install',
        '--no-cache-dir', '--no-input', '--disable-pip-version-check',
        '--index-url', INDEX_URL,
        '--target', target,
        '--python-version', version,
        '--only-binary=:all:',
        *packages,
    ]
    lines = [f'$ {" ".join(cmd)}']
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=BUILD_TIMEOUT)
    combined = (proc.stdout or '') + (proc.stderr or '')
    lines.extend(combined.splitlines())
    RECENT_LOGS[log_id] = lines[-LOG_MAX_LINES:]
    return proc.returncode, lines


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
            import pip
            return self._reply(200, {
                'ok': True,
                'python': sys.version.split()[0],
                'pip': pip.__version__,
            })
        if self.path.startswith('/log/'):
            log_id = self.path[len('/log/'):]
            return self._reply(200, {'log': RECENT_LOGS.get(log_id, [])})
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

        python_root = os.path.realpath(os.path.join(PKGS_ROOT, 'python'))
        real = os.path.realpath(target)
        if not real.startswith(python_root + os.sep):
            return self._reply(400, {'error': 'target outside /pkgs/python'})
        if not real.endswith(os.path.join('lib', 'python' + version, 'site-packages')):
            return self._reply(400, {'error': 'target must be the runtime site-packages'})

        os.makedirs(real, exist_ok=True)
        _LOG_SEQ[0] += 1
        log_id = str(_LOG_SEQ[0])
        print(f'[build #{log_id}] python {version}: pip install {" ".join(packages)}', flush=True)

        try:
            returncode, lines = run_pip(version, target, packages, log_id)
        except subprocess.TimeoutExpired:
            RECENT_LOGS[log_id] = [f'build timeout ({BUILD_TIMEOUT}s)']
            return self._reply(500, {
                'error': f'build timeout ({BUILD_TIMEOUT}s)',
                'log_id': log_id,
                'log': RECENT_LOGS[log_id],
            })

        errors, warnings, notices = classify(lines)
        log_text = '\n'.join(lines[-LOG_MAX_LINES:])

        if returncode != 0:
            # 真正的失败：以 ERROR 行为准；若没有 ERROR 行，退回输出末尾
            message = ' | '.join(errors[-3:]) if errors else (
                ' | '.join(l.strip() for l in lines[-3:] if l.strip()) or 'pip 安装失败'
            )
            print(f'[build #{log_id}] FAILED: {message}', flush=True)
            return self._reply(500, {
                'error': message,
                'log_id': log_id,
                'log': log_text,
                'warnings': warnings[-5:],
                'notices': notices[-5:],
            })

        print(f'[build #{log_id}] OK: {", ".join(packages)}', flush=True)
        self._reply(200, {
            'success': True,
            'installed': packages,
            'log_id': log_id,
            'log': log_text,
            'warnings': warnings[-5:],
            'notices': notices[-5:],
        })


if __name__ == '__main__':
    print(f'env-builder listening on 0.0.0.0:{PORT} (index: {INDEX_URL})', flush=True)
    HTTPServer(('0.0.0.0', PORT), Handler).serve_forever()
