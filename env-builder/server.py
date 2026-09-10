#!/usr/bin/env python3
# CodePad Lite env-builder：把第三方 pip 包安装进 Piston 共享卷的 site-packages。
# 智能化构建（需求 4.x）：
#  - 自动换源重试：官方源 → 清华源 → 阿里云源，最多 3 次尝试；
#  - 失败原因分析：网络/超时 → 换源；依赖版本冲突 → 加 --upgrade 重试；
#    参数错误（如高级模式填错）→ 立即停止并给出明确提示，不浪费重试；
#  - 每条执行命令与策略决策都写进构建日志（$ 前缀 = 实际执行的命令）；
#  - 高级模式：后端已过滤的自定义 pip 参数在此再次校验（防御纵深），
#    仅允许白名单内的 pip 选项，禁止任何系统命令。
import json
import os
import re
import shutil
import subprocess
import sys
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

PKGS_ROOT = '/pkgs'
# 沙箱共享库目录（管理员在后台给「终端沙箱」装的库）：
# 该目录被同时挂进 term-runner（只读，PYTHONPATH 指向它），故安装路径必须严格限定。
SANDBOX_ROOT = os.path.realpath(os.path.join(PKGS_ROOT, 'sandbox'))
PORT = int(os.environ.get('PORT', '3100'))
INDEX_URL = os.environ.get('PIP_INDEX_URL', 'https://pypi.org/simple')
# 镜像源顺序（需求：官方 → 清华 → 阿里云）；用户自定义源时尊重用户选择不切换
FALLBACK_INDEXES = [
    'https://pypi.tuna.tsinghua.edu.cn/simple',
    'https://mirrors.aliyun.com/pypi/simple/',
]
MAX_ATTEMPTS = 3
ATTEMPT_TIMEOUT = 150          # 单次尝试超时（秒）
BUILD_DEADLINE = 400           # 整个构建的总时间预算（秒，< 后端 HTTP 超时）
VER_RE = re.compile(r'^3\.(9|10|11)$')
PKG_RE = re.compile(r'^[A-Za-z0-9][A-Za-z0-9._-]*(==|>=|<=|!=|~=|===|>|<)?[A-Za-z0-9._*+!-]*$')
LOG_MAX_LINES = 200
MAX_ATTEMPT_LINES = 90         # 单次尝试的 pip 输出最多保留行数（防止刷屏）

# ── 自定义参数白名单（仅 pip 选项，杜绝系统命令注入）──
URL_FLAGS = {'-i', '--index-url', '--extra-index-url', '--find-links'}
VALUE_FLAGS = {'--only-binary', '--no-binary', '--upgrade-strategy', '--timeout',
               '--retries', '--trusted-host'}
NOVAL_FLAGS = {'--no-cache-dir', '--prefer-binary', '--no-deps', '--no-build-isolation',
               '--pre', '--upgrade'}
URL_RE = re.compile(r'^https://[A-Za-z0-9._\-/:~+%?=]+$')
VALUE_RE = re.compile(r'^[A-Za-z0-9._:+,~*-]+$')
FORBIDDEN_CHARS = set("\n\r;|&`$<>\\'\"")

# 失败原因分类（正则，大小写不敏感）
NET_RE = re.compile(
    r'retrying|timed?\s?out|readtimedout|connecttimeout|connection\s*(refused|aborted|reset|failed)'
    r'|failed to establish|network is unreachable|temporary failure in name resolution'
    r'|no route to host|getaddrinfo|ssl|proxyerror|connection error',
    re.I,
)
CONFLICT_RE = re.compile(
    r'resolutionimpossible|cannot install|conflicting dependencies|the conflict is caused by'
    r'|to fix this you could|no matching distribution found|metadata generation failed',
    re.I,
)
FATAL_RE = re.compile(
    r'invalid requirement|no such option|unrecognized arguments|unknown option'
    r'|error: the following arguments',
    re.I,
)

# 内存态日志（最近的构建），供 GET /log/<id> 查询
RECENT_LOGS = {}
_LOG_SEQ = [0]


def parse_build_command(text):
    """解析并校验高级模式的自定义 pip 参数。返回 (ok, tokens, error)。"""
    text = (text or '').strip()
    if not text:
        return True, [], None
    if len(text) > 500:
        return False, None, '自定义参数过长（最多 500 字符）'
    if any(ch in FORBIDDEN_CHARS for ch in text):
        return False, None, '包含非法字符（不允许 ; | & ` $ 引号等）'
    toks = text.split()
    if len(toks) > 30:
        return False, None, '参数过多（最多 30 个）'
    out = []
    i = 0
    while i < len(toks):
        tok = toks[i]
        if not tok.startswith('-'):
            return False, None, f'只能填写 pip 参数（如 --pre），收到：{tok}'
        flag, eq, val = tok.partition('=')
        if flag in NOVAL_FLAGS:
            if eq:
                return False, None, f'{flag} 不接受参数值'
            out.append(tok)
            i += 1
        elif flag in URL_FLAGS:
            if eq:
                if not URL_RE.match(val):
                    return False, None, f'{flag} 仅允许 https:// 地址'
                out.append(tok)
                i += 1
            else:
                if i + 1 >= len(toks) or not URL_RE.match(toks[i + 1]):
                    return False, None, f'{flag} 需要 https:// 地址（建议用 {flag}=https://… 形式）'
                out.append(tok)
                out.append(toks[i + 1])
                i += 2
        elif flag in VALUE_FLAGS:
            if eq:
                if not VALUE_RE.match(val):
                    return False, None, f'{flag} 参数值不合法'
                out.append(tok)
                i += 1
            else:
                if i + 1 >= len(toks) or not VALUE_RE.match(toks[i + 1]):
                    return False, None, f'{flag} 需要参数值'
                out.append(tok)
                out.append(toks[i + 1])
                i += 2
        else:
            return False, None, f'不允许的参数：{flag}'
    return True, out, None


def custom_has_primary_index(tokens):
    for i, t in enumerate(tokens):
        if t == '-i' and i + 1 < len(tokens):
            return True
        if t.startswith('--index-url='):
            return True
    return False


def user_primary_index(tokens):
    for i, t in enumerate(tokens):
        if t == '-i' and i + 1 < len(tokens):
            return tokens[i + 1]
        if t.startswith('--index-url='):
            return t.split('=', 1)[1]
    return None


def build_cmd(version, target, packages, custom_tokens, index_url, upgrade):
    cmd = [
        sys.executable, '-m', 'pip', 'install',
        '--no-cache-dir', '--no-input', '--disable-pip-version-check',
        '--retries', '2',          # 快速失败，便于换源重试
    ]
    if upgrade:
        cmd.append('--upgrade')    # 版本冲突策略：自动升级相关依赖
    if not custom_has_primary_index(custom_tokens):
        cmd += ['--index-url', index_url]
    cmd += custom_tokens
    cmd += ['--target', target, '--python-version', version, '--only-binary=:all:']
    cmd += packages
    return cmd


def analyze_failure(combined):
    if FATAL_RE.search(combined):
        return 'bad_args'
    if NET_RE.search(combined):
        return 'network'
    if CONFLICT_RE.search(combined):
        return 'conflict'
    return 'other'


REASON_TEXT = {
    'network': '疑似网络/超时问题（连接失败、超时或重试耗尽）',
    'conflict': '疑似依赖版本冲突或找不到匹配版本',
    'bad_args': 'pip 参数错误（请检查高级模式的自定义参数）',
    'other': '未识别的原因',
}


def classify(lines):
    """把 pip 输出分成 错误 / 警告 / 通知 三类（忽略 $ 命令行与 [CodePad] 策略行）。"""
    errors, warnings, notices = [], [], []
    for raw in lines:
        s = raw.strip()
        if not s or s.startswith('$ ') or s.startswith('[CodePad]'):
            continue
        if s.startswith('ERROR') or 'ERROR:' in s:
            errors.append(s)
        elif s.startswith('WARNING') or '[notice]' in s:
            if '[notice]' in s:
                notices.append(s)
            else:
                warnings.append(s)
    return errors, warnings, notices


def run_build(version, target, packages, custom_tokens, log_id):
    """带策略的重试循环：最多 MAX_ATTEMPTS 次，逐条记录命令与决策到日志。"""
    lines = []
    user_index = user_primary_index(custom_tokens)
    if user_index:
        indexes = [user_index] * MAX_ATTEMPTS   # 尊重用户自定义源，不自动切换
    else:
        indexes = list(dict.fromkeys([INDEX_URL] + FALLBACK_INDEXES))[:MAX_ATTEMPTS]

    deadline = time.monotonic() + BUILD_DEADLINE
    upgrade = False
    result_code = 1

    for attempt_no in range(1, MAX_ATTEMPTS + 1):
        idx = indexes[attempt_no - 1]
        lines.append(f'[CodePad] 第 {attempt_no}/{MAX_ATTEMPTS} 次尝试')
        if user_index:
            lines.append(f'[CodePad] 镜像源：{idx}（用户自定义，优先使用不切换）')
        else:
            lines.append(f'[CodePad] 镜像源：{idx}')
        if custom_tokens:
            lines.append(f'[CodePad] 自定义参数：{" ".join(custom_tokens)}')
        if upgrade:
            lines.append('[CodePad] 策略：已添加 --upgrade 尝试升级依赖解决版本冲突')

        cmd = build_cmd(version, target, packages, custom_tokens, idx, upgrade)
        lines.append(f'$ {" ".join(cmd)}')

        remaining = deadline - time.monotonic()
        if remaining <= 5:
            lines.append(f'[CodePad] 构建总时长超过 {BUILD_DEADLINE}s，停止重试')
            break
        attempt_timeout = min(ATTEMPT_TIMEOUT, max(5, remaining - 5))

        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=attempt_timeout)
        except subprocess.TimeoutExpired:
            combined = f'pip install 超时（{attempt_timeout:.0f}s）'
            lines.append(combined)
            reason = 'network'
        else:
            combined = (proc.stdout or '') + (proc.stderr or '')
            lines.extend(combined.splitlines()[-MAX_ATTEMPT_LINES:])
            result_code = proc.returncode
            reason = analyze_failure(combined) if proc.returncode != 0 else 'ok'

        if reason == 'ok':
            lines.append('[CodePad] ✅ 构建成功')
            RECENT_LOGS[log_id] = lines[-LOG_MAX_LINES:]
            return 0, lines

        lines.append(f'[CodePad] 失败分析：{REASON_TEXT[reason]}')
        if reason == 'bad_args':
            lines.append('[CodePad] 请修正「高级选项」中的自定义参数后重建')
            break
        if reason == 'conflict' and not upgrade:
            upgrade = True
            lines.append('[CodePad] 策略：下次尝试添加 --upgrade 自动升级相关依赖')
        elif attempt_no < MAX_ATTEMPTS:
            if user_index:
                lines.append('[CodePad] 策略：按用户指定源原样重试')
            else:
                lines.append('[CodePad] 策略：切换到下一镜像源重试')

    RECENT_LOGS[log_id] = lines[-LOG_MAX_LINES:]
    return result_code or 1, lines


def norm_dist(name):
    """PEP 503 归一化：比较发行版名时忽略大小写与 - _ . 差异。"""
    return re.sub(r'[-_.]+', '_', str(name)).lower()


def uninstall_from_sandbox(name):
    """按 dist-info/RECORD 卸载沙箱共享库里的一个包。

    只允许操作 SANDBOX_ROOT（沙箱共享卷），且 RECORD 里每条路径都要 realpath 复核在目录内，
    避免被污染的记录文件删到卷外。返回 (删除条目数, 日志行)。
    """
    target = SANDBOX_ROOT
    msgs = []
    if not os.path.isdir(target):
        return 0, [f'沙箱库目录不存在：{target}']
    norm = norm_dist(name)
    dist_infos = []
    for entry in os.listdir(target):
        if not entry.endswith('.dist-info'):
            continue
        base = entry[: -len('.dist-info')]
        proj = base.rsplit('-', 1)[0] if '-' in base else base
        if norm_dist(proj) == norm:
            dist_infos.append(entry)
    if not dist_infos:
        return 0, [f'未找到已安装的 {name}（可能未安装或由镜像预装）']

    removed = 0
    for di in dist_infos:
        di_path = os.path.join(target, di)
        record = os.path.join(di_path, 'RECORD')
        rels = []
        if os.path.isfile(record):
            with open(record, 'r', encoding='utf-8', errors='replace') as fh:
                for line in fh:
                    rel = line.split(',', 1)[0].strip()
                    if rel:
                        rels.append(rel)
        for rel in rels:
            full = os.path.realpath(os.path.join(target, rel))
            if full == target or not full.startswith(target + os.sep):
                msgs.append(f'跳过越界路径：{rel}')
                continue
            try:
                if os.path.isdir(full) and not os.path.islink(full):
                    os.rmdir(full)
                else:
                    os.remove(full)
                removed += 1
            except FileNotFoundError:
                pass
            except OSError as err:
                msgs.append(f'无法删除 {rel}：{err}')
        shutil.rmtree(di_path, ignore_errors=True)
        msgs.append(f'已移除 {di}（含 {len(rels)} 条记录）')

    # 清理卸载后留下的空目录（只删空目录，不动有内容的）
    for root, _dirs, _files in os.walk(target, topdown=False):
        if root == target:
            continue
        try:
            if not os.listdir(root):
                os.rmdir(root)
        except OSError:
            pass
    return removed, msgs


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
        if self.path == '/uninstall':
            try:
                length = int(self.headers.get('Content-Length', 0) or 0)
                body = json.loads(self.rfile.read(length) or b'{}')
            except (ValueError, json.JSONDecodeError):
                return self._reply(400, {'error': 'invalid json'})
            packages = body.get('packages') or ([body['package']] if body.get('package') else [])
            if not isinstance(packages, list) or not (1 <= len(packages) <= 20):
                return self._reply(400, {'error': 'packages must be 1-20 names'})
            for p in packages:
                if not PKG_RE.match(str(p)):
                    return self._reply(400, {'error': 'invalid package name: ' + str(p)})

            total = 0
            results = []
            lines = []
            for p in packages:
                removed, msgs = uninstall_from_sandbox(str(p))
                total += removed
                results.append({'package': str(p), 'removed': removed, 'messages': msgs})
                lines.append(f'$ pip uninstall {p}（沙箱共享库）')
                lines.extend(msgs)
            print(f'[uninstall] {", ".join(str(p) for p in packages)} -> {total} files', flush=True)
            return self._reply(200, {
                'success': True,
                'removed': total,
                'results': results,
                'log': '\n'.join(lines[-LOG_MAX_LINES:]),
            })

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
        build_command = str(body.get('build_command') or '')

        if not VER_RE.match(version):
            return self._reply(400, {'error': 'invalid python_version'})
        if not isinstance(packages, list) or not (1 <= len(packages) <= 50):
            return self._reply(400, {'error': 'packages must be 1-50 names'})
        for p in packages:
            if not PKG_RE.match(p):
                return self._reply(400, {'error': 'invalid package name: ' + p})

        ok, custom_tokens, cmd_err = parse_build_command(build_command)
        if not ok:
            return self._reply(400, {'error': f'自定义参数不合法：{cmd_err}'})

        python_root = os.path.realpath(os.path.join(PKGS_ROOT, 'python'))
        real = os.path.realpath(target)
        is_env_target = real.startswith(python_root + os.sep) and real.endswith(
            os.path.join('lib', 'python' + version, 'site-packages'))
        # 沙箱共享库：整卷就是 site-packages，路径必须是那个固定目录本身
        is_sandbox_target = real == SANDBOX_ROOT
        if not (is_env_target or is_sandbox_target):
            return self._reply(400, {'error': 'target must be a runtime site-packages or the sandbox packages root'})

        os.makedirs(real, exist_ok=True)
        _LOG_SEQ[0] += 1
        log_id = str(_LOG_SEQ[0])
        print(f'[build #{log_id}] python {version}: pip install {" ".join(packages)}'
              + (f' (custom: {" ".join(custom_tokens)})' if custom_tokens else ''), flush=True)

        returncode, lines = run_build(version, target, packages, custom_tokens, log_id)
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
    print(f'env-builder listening on 0.0.0.0:{PORT} '
          f'(index: {INDEX_URL}, fallbacks: {FALLBACK_INDEXES})', flush=True)
    HTTPServer(('0.0.0.0', PORT), Handler).serve_forever()
