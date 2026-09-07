import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../api/client';
import { useMonitorStore } from '../store/monitorStore';
import NeonChart from './NeonChart';

function fmtUptime(sec) {
  sec = Math.max(0, Math.floor(Number(sec) || 0));
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const parts = [];
  if (d) parts.push(`${d}天`);
  if (h || d) parts.push(`${h}小时`);
  if (m || h || d) parts.push(`${m}分`);
  parts.push(`${s}秒`);
  return parts.join(' ');
}

function fmtBytes(n) {
  if (typeof n !== 'number') return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}

// 可折叠分区（弹簧高度动画）
function Section({ title, open, onToggle, children }) {
  return (
    <div className="glass rounded-2xl">
      <button
        onClick={onToggle}
        className="flex h-12 w-full items-center gap-2 px-4 text-left"
        aria-expanded={open}
      >
        <span className="flex-1 text-sm font-semibold tracking-wider text-slate-200">{title}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-xs text-slate-500"
        >
          ▼
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/10 p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Bar({ percent, gradient = 'linear-gradient(90deg,#00f0ff,#a855f7)' }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${Math.min(100, Math.max(0, percent))}%`,
          background: gradient,
          boxShadow: '0 0 8px rgba(0,240,255,0.5)',
        }}
      />
    </div>
  );
}

function MetricRow({ label, value, percent, extra }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="text-slate-400">{label}</span>
        <span className="text-cyan-200">{value}</span>
      </div>
      {typeof percent === 'number' && <Bar percent={percent} />}
      {extra && <p className="mt-1 text-xs text-slate-500">{extra}</p>}
    </div>
  );
}

const latencyCls = (ms) => {
  if (ms == null) return 'text-slate-500';
  if (ms < 50) return 'text-emerald-300';
  if (ms < 150) return 'text-amber-300';
  return 'text-rose-300';
};

// 图表系列定义（图例芯片即开关）
const SERIES = [
  { key: 'memRss', label: '后端进程内存', color: '#00f0ff', unit: 'MB' },
  { key: 'sysUsed', label: '系统已用内存', color: '#a855f7', unit: 'MB' },
  { key: 'heap', label: '堆内存', color: '#0088ff', unit: 'MB' },
  { key: 'load1', label: 'CPU 负载(1min)', color: '#fbbf24', unit: '' },
  { key: 'ali', label: '阿里DNS延迟', color: '#34d399', unit: 'ms' },
  { key: 'cf', label: 'Cloudflare延迟', color: '#fb923c', unit: 'ms' },
  { key: 'piston', label: '执行引擎延迟', color: '#f472b6', unit: 'ms' },
  { key: 'gpu', label: '显存占用', color: '#facc15', unit: 'MB' },
];

const DEFAULT_VISIBLE = { memRss: true, sysUsed: true, ali: true, piston: true };

export default function AdminMonitor() {
  const [monitor, setMonitor] = useState(null);
  const [counts, setCounts] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState({
    chart: true,
    memory: true,
    cpu: true,
    net: true,
    gpu: true,
    engine: true,
    db: true,
    sys: true,
  });
  const [visible, setVisible] = useState(DEFAULT_VISIBLE);
  const samples = useMonitorStore((s) => s.samples);
  const pushSample = useMonitorStore((s) => s.pushSample);

  const load = useCallback(async () => {
    try {
      const [m, s] = await Promise.all([api('/api/admin/monitor'), api('/api/admin/stats')]);
      setMonitor(m);
      setCounts(s.counts);
      setError('');
      pushSample(m);
    } catch (err) {
      setError(err.message || '加载失败');
    }
  }, [pushSample]);

  // 5 秒实时采样
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const toggle = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }));
  const toggleVisible = (key) => setVisible((v) => ({ ...v, [key]: !v[key] }));

  if (error && !monitor) {
    return (
      <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
        {error}
      </p>
    );
  }
  if (!monitor) {
    return <p className="py-10 text-center text-sm text-slate-500">加载中…</p>;
  }

  const chartSeries = SERIES.map((s) => ({
    ...s,
    visible: Boolean(visible[s.key]),
    values: samples.map((x) => x[s.key]),
  }));

  const memPercent = monitor.os.totalmem ? (monitor.memory.rss / monitor.os.totalmem) * 100 : 0;
  const sysUsedBytes = monitor.os.totalmem - monitor.os.freemem;
  const sysPercent = monitor.os.totalmem ? (sysUsedBytes / monitor.os.totalmem) * 100 : 0;
  const heapPercent = monitor.memory.heapTotal
    ? (monitor.memory.heapUsed / monitor.memory.heapTotal) * 100
    : 0;
  const gpuPercent = monitor.gpu.available
    ? monitor.gpu.memoryTotalMb
      ? (monitor.gpu.memoryUsedMb / monitor.gpu.memoryTotalMb) * 100
      : 0
    : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wider text-slate-300">
          系统运行状态 · 5 秒实时采样
        </h3>
        <button
          onClick={load}
          className="flex h-10 items-center gap-1.5 rounded-lg bg-white/5 px-3 text-sm text-slate-300 transition hover:bg-white/10"
        >
          ↻ 刷新
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}

      {/* ── 实时趋势折线图 ── */}
      <Section title="📈 实时趋势" open={open.chart} onToggle={() => toggle('chart')}>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {SERIES.map((s) => {
            const on = Boolean(visible[s.key]);
            const latest = samples.length ? samples[samples.length - 1][s.key] : null;
            return (
              <button
                key={s.key}
                onClick={() => toggleVisible(s.key)}
                className={`flex h-9 items-center gap-1.5 rounded-full border px-2.5 text-[11px] transition ${
                  on ? 'border-white/20 bg-white/5 text-slate-200' : 'border-white/5 text-slate-600'
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: s.color, boxShadow: on ? `0 0 6px ${s.color}` : 'none' }}
                />
                {s.label}
                {typeof latest === 'number' ? ` · ${latest}${s.unit}` : ''}
              </button>
            );
          })}
        </div>
        <NeonChart series={chartSeries} />
      </Section>

      {/* ── 内存 ── */}
      <Section title="💾 内存" open={open.memory} onToggle={() => toggle('memory')}>
        <div className="space-y-4">
          <MetricRow
            label="后端进程内存 (RSS)"
            value={fmtBytes(monitor.memory.rss)}
            percent={memPercent}
            extra={`占系统 ${memPercent.toFixed(1)}%`}
          />
          <MetricRow
            label="系统内存"
            value={`${fmtBytes(sysUsedBytes)} / ${fmtBytes(monitor.os.totalmem)}`}
            percent={sysPercent}
            extra={`可用 ${fmtBytes(monitor.os.freemem)}`}
          />
          <MetricRow
            label="Node 堆内存"
            value={`${fmtBytes(monitor.memory.heapUsed)} / ${fmtBytes(monitor.memory.heapTotal)}`}
            percent={heapPercent}
          />
        </div>
      </Section>

      {/* ── CPU ── */}
      <Section title="⚡ CPU 与运行时长" open={open.cpu} onToggle={() => toggle('cpu')}>
        <div className="grid grid-cols-2 gap-3">
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-slate-500">负载（1 / 5 / 15 分钟）</p>
            <p className="mt-1 text-sm text-purple-300">
              {monitor.os.loadavg.map((n) => Number(n).toFixed(2)).join(' / ')}
            </p>
          </div>
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-slate-500">CPU 核心数</p>
            <p className="mt-1 text-sm text-cyan-200">{monitor.os.cpus} 核</p>
          </div>
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-slate-500">后端进程运行时长</p>
            <p className="mt-1 text-sm text-cyan-200">{fmtUptime(monitor.uptime.process)}</p>
          </div>
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-slate-500">系统运行时长</p>
            <p className="mt-1 text-sm text-cyan-200">{fmtUptime(monitor.uptime.system)}</p>
          </div>
        </div>
      </Section>

      {/* ── 网络质量 ── */}
      <Section title="🌐 网络质量" open={open.net} onToggle={() => toggle('net')}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {monitor.network.targets.map((t) => (
            <div key={`${t.host}:${t.port}`} className="glass rounded-xl p-3">
              <p className="text-xs text-slate-500">
                {t.host}:{t.port}
              </p>
              {t.ok ? (
                <p className={`mt-1 text-lg font-semibold ${latencyCls(t.latency_ms)}`}>
                  {t.latency_ms} ms
                </p>
              ) : (
                <p className="mt-1 text-lg font-semibold text-rose-400">超时/不通</p>
              )}
              <p className="mt-0.5 text-[10px] text-slate-600">
                {t.latency_ms != null && t.latency_ms < 50
                  ? '网络流畅'
                  : t.latency_ms != null && t.latency_ms < 150
                    ? '网络一般'
                    : t.ok
                      ? '网络延迟较高'
                      : '该目标不可达（可能被防火墙屏蔽）'}
              </p>
            </div>
          ))}
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-slate-500">执行引擎 (Piston) 响应</p>
            {monitor.piston.ok ? (
              <p className={`mt-1 text-lg font-semibold ${latencyCls(monitor.piston.latency_ms)}`}>
                {monitor.piston.latency_ms} ms
              </p>
            ) : (
              <p className="mt-1 text-lg font-semibold text-rose-400">离线</p>
            )}
            <p className="mt-0.5 text-[10px] text-slate-600">容器内网往返延迟</p>
          </div>
        </div>
      </Section>

      {/* ── GPU / 显存 ── */}
      <Section title="🎮 GPU / 显存" open={open.gpu} onToggle={() => toggle('gpu')}>
        {monitor.gpu.available ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-200">
              <span className="text-slate-500">显卡：</span>
              {monitor.gpu.name}
            </p>
            <MetricRow
              label="显存占用"
              value={`${monitor.gpu.memoryUsedMb} MB / ${monitor.gpu.memoryTotalMb} MB`}
              percent={gpuPercent}
            />
            <MetricRow label="GPU 利用率" value={`${monitor.gpu.utilization}%`} percent={monitor.gpu.utilization} />
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-slate-500">
            未检测到 GPU。
            <br />
            当前后端容器内没有可用的 nvidia-smi（未做 GPU 透传或无 NVIDIA 显卡）。
            若服务器有显卡并希望监控显存，需为 backend 容器配置 GPU 运行时并挂载 nvidia-smi。
          </p>
        )}
      </Section>

      {/* ── 执行引擎 ── */}
      <Section title="🧩 代码执行引擎（Piston）" open={open.engine} onToggle={() => toggle('engine')}>
        <div className="flex flex-wrap items-center gap-2">
          {monitor.piston.ok ? (
            <span className="rounded-full border border-emerald-400/40 bg-emerald-400/15 px-2.5 py-0.5 text-xs text-emerald-300">
              ● 在线 {monitor.piston.latency_ms}ms
            </span>
          ) : (
            <span className="rounded-full border border-rose-400/40 bg-rose-400/15 px-2.5 py-0.5 text-xs text-rose-300">
              ● 离线
            </span>
          )}
          {monitor.piston.runtimes.map((r) => (
            <span
              key={r}
              className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[11px] text-cyan-300"
            >
              {r}
            </span>
          ))}
        </div>
      </Section>

      {/* ── 数据库与统计 ── */}
      <Section title="🗄 数据库与资源统计" open={open.db} onToggle={() => toggle('db')}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="glass rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-cyan-300">{fmtBytes(monitor.db.sizeBytes)}</p>
            <p className="mt-1 text-xs text-slate-500">数据库体积</p>
          </div>
          {counts && (
            <>
              <div className="glass rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-cyan-300">{counts.users}</p>
                <p className="mt-1 text-xs text-slate-500">用户（待审 {counts.pending}）</p>
              </div>
              <div className="glass rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-cyan-300">{counts.projects}</p>
                <p className="mt-1 text-xs text-slate-500">项目</p>
              </div>
              <div className="glass rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-cyan-300">
                  {counts.files} / {counts.executions}
                </p>
                <p className="mt-1 text-xs text-slate-500">文件 / 执行次数</p>
              </div>
            </>
          )}
        </div>
      </Section>

      {/* ── 系统信息 ── */}
      <Section title="🖥 系统信息" open={open.sys} onToggle={() => toggle('sys')}>
        <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-slate-400">
          <span>Node.js {monitor.node.version}</span>
          <span>
            系统 {monitor.os.platform} / {monitor.os.arch}
          </span>
          <span>采样时间 {new Date(monitor.timestamp).toLocaleTimeString()}</span>
        </div>
      </Section>
    </div>
  );
}
