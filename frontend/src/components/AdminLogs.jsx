import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';

const STATUS_META = {
  success: { label: '成功', badge: 'border-emerald-400/40 bg-emerald-400/15 text-emerald-300' },
  compile_error: { label: '编译错误', badge: 'border-rose-400/40 bg-rose-400/15 text-rose-300' },
  runtime_error: { label: '运行错误', badge: 'border-orange-400/40 bg-orange-400/15 text-orange-300' },
  timeout: { label: '超时', badge: 'border-amber-400/40 bg-amber-400/15 text-amber-300' },
  engine_error: { label: '引擎错误', badge: 'border-red-400/40 bg-red-400/15 text-red-300' },
};

const LANG_BADGE = {
  cpp: 'border-sky-400/40 bg-sky-400/15 text-sky-300',
  python: 'border-amber-400/40 bg-amber-400/15 text-amber-300',
};

// 执行日志：最近 100 条代码执行审计记录
export default function AdminLogs() {
  const [logs, setLogs] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api('/api/admin/logs?limit=100');
      setLogs(data.logs);
    } catch (err) {
      setError(err.message || '加载失败');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wider text-slate-300">最近 100 条执行记录</h3>
        <button
          onClick={load}
          className="flex h-10 items-center gap-1.5 rounded-lg bg-white/5 px-3 text-sm text-slate-300 transition hover:bg-white/10"
        >
          ↻ 刷新
        </button>
      </div>

      {error && (
        <p className="mb-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}

      {!logs ? (
        <p className="py-10 text-center text-sm text-slate-500">加载中…</p>
      ) : logs.length === 0 ? (
        <div className="glass rounded-2xl py-12 text-center">
          <div className="text-4xl">📜</div>
          <p className="mt-3 text-sm text-slate-500">暂无执行记录</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((l) => {
            const meta = STATUS_META[l.status] || STATUS_META.engine_error;
            return (
              <div key={l.id} className="glass flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl px-4 py-3">
                <span className="w-[130px] shrink-0 text-xs text-slate-500">
                  {String(l.created_at || '').slice(0, 16)}
                </span>
                <span className="min-w-0 max-w-[200px] flex-1 truncate text-xs text-slate-300">
                  {l.email}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] ${
                    LANG_BADGE[l.language] || 'border-slate-500/40 bg-slate-500/15 text-slate-300'
                  }`}
                >
                  {l.language}
                </span>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] ${meta.badge}`}>
                  {meta.label}
                </span>
                <span className="text-[11px] text-slate-500">
                  退出码 {l.exit_code ?? '—'} · 耗时{' '}
                  {typeof l.execution_time === 'number' ? `${Number(l.execution_time).toFixed(2)}s` : '—'}
                </span>
                <span className="text-[11px] text-slate-600">{l.code_length} 字符</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
