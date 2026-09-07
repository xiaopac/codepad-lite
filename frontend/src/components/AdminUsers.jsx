import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { toast } from '../store/toastStore';

const STATUS_META = {
  pending: { label: '待审核', badge: 'border-amber-400/40 bg-amber-400/15 text-amber-300' },
  active: { label: '已激活', badge: 'border-emerald-400/40 bg-emerald-400/15 text-emerald-300' },
  rejected: { label: '已拒绝', badge: 'border-rose-400/40 bg-rose-400/15 text-rose-300' },
};

function CountChip({ label, value, color }) {
  return (
    <div className={`glass rounded-xl p-3 text-center ${color}`}>
      <p className="text-xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}

// 用户管理：注册审核（三态）+ 注册指纹展示
export default function AdminUsers() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api('/api/admin/users');
      setUsers(data.users);
    } catch (err) {
      setError(err.message || '加载失败');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (u, action) => {
    setBusyId(u.id);
    try {
      await api(`/api/admin/users/${u.id}/${action}`, { method: 'POST' });
      toast.success(`「${u.email}」${action === 'approve' ? '已通过审核' : '已被拒绝'}`);
      load();
    } catch (err) {
      toast.error(err.message || '操作失败');
    } finally {
      setBusyId(null);
    }
  };

  const counts = users
    ? {
        total: users.length,
        pending: users.filter((u) => u.status === 'pending').length,
        active: users.filter((u) => u.status === 'active').length,
        rejected: users.filter((u) => u.status === 'rejected').length,
      }
    : null;

  return (
    <div className="mx-auto max-w-3xl">
      {counts && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CountChip label="注册总数" value={counts.total} color="text-cyan-300" />
          <CountChip label="待审核" value={counts.pending} color="text-amber-300" />
          <CountChip label="已激活" value={counts.active} color="text-emerald-300" />
          <CountChip label="已拒绝" value={counts.rejected} color="text-rose-300" />
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wider text-slate-300">注册用户</h3>
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

      {!users ? (
        <p className="py-10 text-center text-sm text-slate-500">加载中…</p>
      ) : users.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">暂无注册用户</p>
      ) : (
        <div className="space-y-3">
          {users.map((u) => {
            const meta = STATUS_META[u.status] || STATUS_META.pending;
            const isAdmin = u.role === 'admin';
            return (
              <div key={u.id} className="glass rounded-2xl p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100">
                    {u.email}
                  </span>
                  {isAdmin ? (
                    <span
                      className="rounded-full border border-purple-400/50 bg-purple-400/15 px-2.5 py-0.5 text-xs text-purple-300"
                      style={{ boxShadow: '0 0 10px rgba(168,85,247,0.35)' }}
                    >
                      🛡 管理员
                    </span>
                  ) : (
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs ${meta.badge}`}>
                      {meta.label}
                    </span>
                  )}
                </div>

                {/* 注册指纹 */}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>🌐 {u.ip_address || '—'}</span>
                  <span>📍 {u.location || '未知'}</span>
                  <span>🕐 {String(u.registered_at || u.created_at || '').slice(0, 16)}</span>
                </div>
                {u.user_agent && (
                  <p className="mt-1.5 truncate text-[11px] text-slate-600" title={u.user_agent}>
                    🖥 {u.user_agent}
                  </p>
                )}

                {!isAdmin && (
                  <div className="mt-3 flex gap-2 border-t border-white/10 pt-3">
                    <button
                      onClick={() => setStatus(u, 'approve')}
                      disabled={busyId === u.id || u.status === 'active'}
                      className="h-11 flex-1 rounded-lg bg-emerald-500/90 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-40"
                    >
                      {u.status === 'pending' ? '✓ 通过审核' : '✓ 重新激活'}
                    </button>
                    <button
                      onClick={() => setStatus(u, 'reject')}
                      disabled={busyId === u.id || u.status === 'rejected'}
                      className="h-11 flex-1 rounded-lg border border-rose-400/50 bg-rose-500/10 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/25 disabled:opacity-40"
                    >
                      {u.status === 'active' ? '✕ 封禁账号' : '✕ 拒绝'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
