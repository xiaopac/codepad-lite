import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { toast } from '../store/toastStore';

// 管理员后台：终端沙箱第三方库管理
// - pip 库：走 env-builder（有外网）装进共享卷，沙箱通过 PYTHONPATH 读取，秒级生效、可卸载
// - 系统级组件（tkinter 这类 apt 包）：pip 装不了，只能改构建参数后重建 term-runner 镜像
const QUICK_PACKAGES = ['numpy', 'requests', 'pandas', 'matplotlib', 'scipy', 'openpyxl', 'beautifulsoup4', 'sympy'];

const CARD = 'glass rounded-2xl p-4';
const BTN = 'flex h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition';

// 时间显示：今天只显示时分秒，其余带日期
const fmtTime = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const hms = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  return sameDay ? hms : `${p(d.getMonth() + 1)}-${p(d.getDate())} ${hms}`;
};

const fmtDuration = (ms) => {
  if (!ms && ms !== 0) return '';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
};

// 后端返回的是 SQLite 的 "YYYY-MM-DD HH:MM:SS"（UTC）
const toMs = (v) => (v ? Date.parse(`${String(v).replace(' ', 'T')}Z`) : null);

const STATUS_META = {
  running: { label: '进行中', cls: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200' },
  done: { label: '成功', cls: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' },
  error: { label: '失败', cls: 'border-rose-400/30 bg-rose-500/10 text-rose-300' },
};

export default function AdminSandbox() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState([]);
  const [openLog, setOpenLog] = useState(null); // { id, text } 展开查看的那一条
  const [logLoading, setLogLoading] = useState(0);
  const timerRef = useRef(0);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [d, l] = await Promise.all([
        api('/api/admin/sandbox'),
        api('/api/admin/sandbox/logs?limit=50').catch(() => ({ logs: [] })),
      ]);
      setData(d);
      setLogs(l.logs || []);
      setError('');
      return d;
    } catch (e) {
      setError(e.message || '读取沙箱信息失败');
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const toggleLog = async (row) => {
    if (openLog?.id === row.id) {
      setOpenLog(null);
      return;
    }
    setLogLoading(row.id);
    try {
      const d = await api(`/api/admin/sandbox/logs/${row.id}`);
      setOpenLog({ id: row.id, text: d.log?.log || '（无输出）' });
    } catch (e) {
      toast.error(e.message || '读取日志失败');
    } finally {
      setLogLoading(0);
    }
  };

  useEffect(() => {
    load();
    return () => clearTimeout(timerRef.current);
  }, [load]);

  // 安装/卸载进行中：轮询直到作业结束
  useEffect(() => {
    const running = data?.job?.status === 'running';
    if (!running) return undefined;
    timerRef.current = setTimeout(() => load(true), 2500);
    return () => clearTimeout(timerRef.current);
  }, [data, load]);

  const startJob = async (fn, okMsg) => {
    setBusy(true);
    try {
      const r = await fn();
      toast.success(okMsg);
      await load(true);
      return r;
    } catch (e) {
      toast.error(e.message || '操作失败');
    } finally {
      setBusy(false);
    }
    return null;
  };

  const install = () => {
    const names = input.trim();
    if (!names) {
      toast.error('请填写要安装的库名，如 numpy 或 numpy requests');
      return;
    }
    startJob(() => api('/api/admin/sandbox/packages', { method: 'POST', body: { packages: names } }), `已开始安装：${names}`);
  };

  const quickInstall = (name) => {
    setInput((v) => (v.trim() ? `${v.trim()} ${name}` : name));
  };

  const uninstall = (name) => {
    startJob(
      () => api(`/api/admin/sandbox/packages/${encodeURIComponent(name)}`, { method: 'DELETE' }),
      `已开始卸载：${name}`,
    );
  };

  const env = data?.env;
  const job = data?.job;
  const running = busy || job?.status === 'running';
  const managed = env?.managed || [];
  const managedNames = new Set(managed.map((p) => p.name.toLowerCase()));
  const builtin = (env?.packages || []).filter((p) => !managedNames.has(p.name.toLowerCase()));
  const system = env?.system || [];

  const copyCmd = async () => {
    const text = [
      '# .env（服务器项目根目录）',
      'APT_EXTRA_PACKAGES="python3-opencv python3-numpy ffmpeg"',
      '',
      '# 然后重建沙箱镜像',
      'docker compose up -d --build term-runner',
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('命令已复制');
    } catch {
      toast.info('复制失败，请手动抄写下方命令');
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* 概览 */}
      <div className={CARD}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-100">🧪 终端沙箱库</span>
          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] text-cyan-200">
            {env?.python ? `Python ${env.python}` : '读取中…'}
          </span>
          {(env?.tools || []).map((t) => (
            <span key={t.name} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
              {t.name} {t.version}
            </span>
          ))}
          <button onClick={() => load()} disabled={loading} className={`${BTN} ml-auto bg-white/5 text-slate-300 hover:bg-white/10 disabled:opacity-50`}>
            ↻ 刷新
          </button>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          这里管理的是 <b className="text-slate-400">💻 终端运行</b> 的沙箱环境（独立容器，只有内网）。
          pip 库由安装服务装进共享卷后立即生效，<b className="text-slate-400">无需重建镜像</b>；
          用户终端的「ⓘ 沙箱」里也能看到这份清单。
        </p>
        {error && <p className="mt-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>}
      </div>

      {/* 添加库 */}
      <div className={CARD}>
        <p className="text-sm font-semibold text-slate-100">➕ 添加 pip 库</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            className="glass h-11 min-w-[220px] flex-1 rounded-lg px-3 text-sm text-slate-100 outline-none focus:border-cyan-400/60"
            placeholder="库名，多个用空格分隔：numpy requests"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !running && install()}
            disabled={running}
          />
          <button
            onClick={install}
            disabled={running}
            className={`${BTN} h-11 shrink-0 bg-gradient-to-r from-cyan-400 to-blue-500 px-4 text-sm font-semibold text-white shadow-neon-cyan disabled:opacity-50`}
          >
            {running ? '安装中…' : '安装'}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUICK_PACKAGES.map((p) => (
            <button
              key={p}
              onClick={() => quickInstall(p)}
              disabled={running}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-400 transition hover:border-cyan-400/40 hover:text-cyan-200 disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-slate-600">
          只能装 PyPI 上的包（多依赖官方 wheel）。单个包装不动时看下方日志 —— 多为缺少系统库或没有对应 wheel。
        </p>
      </div>

      {/* 作业进度 / 日志 */}
      {job && (
        <div className={CARD}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-100">
              {job.action === 'install' ? '⬇ 安装' : '🗑 卸载'} {job.packages.join(' ')}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] ${
                job.status === 'running'
                  ? 'border border-cyan-400/30 bg-cyan-400/10 text-cyan-200'
                  : job.status === 'done'
                    ? 'border border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                    : 'border border-rose-400/30 bg-rose-500/10 text-rose-300'
              }`}
            >
              {job.status === 'running' ? '进行中…' : job.status === 'done' ? '已完成' : '失败'}
            </span>
            {job.status === 'running' && <span className="text-[10px] text-slate-500">首次安装较大的库可能需要 1-2 分钟</span>}
          </div>
          {job.error && (
            <p className="mt-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[11px] leading-relaxed text-rose-300">
              {job.error}
            </p>
          )}
          {job.log && (
            <pre className="mt-3 max-h-56 overflow-auto scroll-touch rounded-lg bg-[#07070d] p-3 font-mono text-[11px] leading-relaxed text-slate-300">
              {job.log}
            </pre>
          )}
        </div>
      )}

      {/* 操作日志（审计：谁在什么时候装/卸了什么） */}
      <div className={CARD}>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-100">📜 操作日志</p>
          <span className="text-[10px] text-slate-500">
            最近 {logs.length} 条 · 记录管理员、动作、结果与完整 pip 输出
          </span>
          <button
            onClick={() => load(true)}
            className={`${BTN} ml-auto bg-white/5 text-slate-300 hover:bg-white/10`}
          >
            ↻ 刷新
          </button>
        </div>
        {logs.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500">暂无记录 —— 安装或卸载一次后这里会出现日志。</p>
        ) : (
          <div className="mt-3 space-y-2">
            {logs.map((row) => {
              const meta = STATUS_META[row.status] || STATUS_META.error;
              const open = openLog?.id === row.id;
              return (
                <div key={row.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-mono text-[11px] text-slate-500">{fmtTime(toMs(row.created_at))}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${meta.cls}`}>{meta.label}</span>
                    <span className="text-[11px] text-slate-300">
                      {row.action === 'install' ? '⬇ 安装' : '🗑 卸载'} <b>{row.packages.join(' ')}</b>
                    </span>
                    <span className="text-[10px] text-slate-500">by {row.admin_email || '未知'}</span>
                    {row.duration_ms ? <span className="text-[10px] text-slate-600">{fmtDuration(row.duration_ms)}</span> : null}
                    <button
                      onClick={() => toggleLog(row)}
                      className={`${BTN} ml-auto bg-white/5 text-slate-400 hover:bg-white/10 hover:text-cyan-200`}
                    >
                      {logLoading === row.id ? '读取中…' : open ? '收起日志' : '📄 日志'}
                    </button>
                  </div>
                  {row.error && <p className="mt-1 text-[11px] leading-relaxed text-rose-300">{row.error}</p>}
                  {open && (
                    <pre className="mt-2 max-h-64 overflow-auto scroll-touch rounded-lg bg-[#07070d] p-3 font-mono text-[11px] leading-relaxed text-slate-300">
                      {openLog.text}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 管理员添加的库（可卸载） */}
      <div className={CARD}>
        <p className="text-sm font-semibold text-slate-100">
          📦 管理员添加的库
          <span className="ml-2 text-[10px] font-normal text-slate-500">共 {managed.length} 个 · 可卸载</span>
        </p>
        {managed.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500">还没有添加过 —— 上面输入库名即可安装。</p>
        ) : (
          <div className="mt-3 space-y-2">
            {managed.map((p) => (
              <div key={p.name} className="flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                  {p.name}
                  <span className="ml-2 text-[10px] text-cyan-300/70">{p.version}</span>
                </span>
                <button
                  onClick={() => uninstall(p.name)}
                  disabled={running}
                  className={`${BTN} bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 disabled:opacity-50`}
                >
                  🗑 卸载
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 镜像预装的 pip 库 */}
      <div className={CARD}>
        <p className="text-sm font-semibold text-slate-100">
          🐳 镜像预装的 pip 库
          <span className="ml-2 text-[10px] font-normal text-slate-500">随镜像提供，不能在此卸载</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {builtin.length === 0 && <span className="text-xs text-slate-500">（无）</span>}
          {builtin.map((p) => (
            <span key={p.name} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300">
              {p.name}
              <span className="ml-1.5 text-slate-500">{p.version}</span>
            </span>
          ))}
        </div>
      </div>

      {/* 系统级组件（apt） */}
      <div className={CARD}>
        <p className="text-sm font-semibold text-slate-100">
          🧩 系统级组件（apt 内置）
          <span className="ml-2 text-[10px] font-normal text-slate-500">pip 装不了，需重建镜像</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {system.length === 0 && <span className="text-xs text-slate-500">（未探测到）</span>}
          {system.map((s) => (
            <span key={s.name} className="rounded-lg border border-purple-400/25 bg-purple-400/10 px-2 py-1 text-[11px] text-purple-100">
              {s.name}
              <span className="ml-1.5 text-purple-300/70">{s.version}</span>
              {s.apt && <span className="ml-1.5 text-purple-300/50">({s.apt})</span>}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          例如 <b className="text-slate-400">tkinter</b>（python3-tk）、Tcl/Tk、中文字体都已内置，终端里可直接 import。
          需要更多系统组件（如 opencv、ffmpeg、python3-numpy）时，在项目根目录的 <b className="text-slate-400">.env</b> 里加一行，
          然后重建沙箱镜像：
        </p>
        <div className="mt-2 flex items-start gap-2">
          <pre className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-[#07070d] p-3 font-mono text-[11px] leading-relaxed text-slate-300">
{`# .env
APT_EXTRA_PACKAGES="python3-opencv ffmpeg"

# 重建（约 2-5 分钟）
docker compose up -d --build term-runner`}
          </pre>
          <button onClick={copyCmd} className={`${BTN} shrink-0 bg-white/5 text-slate-300 hover:bg-white/10`}>
            📋 复制
          </button>
        </div>
        {data?.aptExtra ? (
          <p className="mt-2 text-[11px] text-emerald-300/90">当前已追加：{data.aptExtra}</p>
        ) : (
          <p className="mt-2 text-[11px] text-slate-600">当前未追加额外系统组件（APT_EXTRA_PACKAGES 为空）</p>
        )}
      </div>
    </div>
  );
}
