import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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

  // 管理员重置用户密码（只能设置新密码，无法查看任何密码）
  const [pwForId, setPwForId] = useState(null);
  const [pwValue, setPwValue] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  const resetPassword = async (u) => {
    if (pwValue.length < 6) {
      toast.error('新密码至少 6 位');
      return;
    }
    setPwBusy(true);
    try {
      await api(`/api/admin/users/${u.id}/password`, {
        method: 'POST',
        body: { newPassword: pwValue },
      });
      toast.success(`已重置「${u.email}」的密码`);
      setPwForId(null);
      setPwValue('');
    } catch (err) {
      toast.error(err.message || '重置失败');
    } finally {
      setPwBusy(false);
    }
  };

  // 管理员调整存储配额（1-10240 MB）
  const [quotaForId, setQuotaForId] = useState(null);
  const [quotaValue, setQuotaValue] = useState('');
  const [quotaBusy, setQuotaBusy] = useState(false);

  const saveQuota = async (u) => {
    const mb = Number(quotaValue);
    if (!Number.isInteger(mb) || mb < 1 || mb > 10240) {
      toast.error('配额需为 1-10240 的整数（MB）');
      return;
    }
    setQuotaBusy(true);
    try {
      await api(`/api/admin/users/${u.id}/quota`, {
        method: 'PUT',
        body: { quota_mb: mb },
      });
      toast.success(`已将「${u.email}」的配额调整为 ${mb}MB`);
      setQuotaForId(null);
      setQuotaValue('');
      load();
    } catch (err) {
      toast.error(err.message || '调整失败');
    } finally {
      setQuotaBusy(false);
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
                  <span>
                    💾 {((u.used_bytes || 0) / 1048576).toFixed(2)} / {u.quota_mb ?? 50} MB
                  </span>
                  <span>🕐 {String(u.registered_at || u.created_at || '').slice(0, 16)}</span>
                </div>
                {u.user_agent && (
                  <p className="mt-1.5 truncate text-[11px] text-slate-600" title={u.user_agent}>
                    🖥 {u.user_agent}
                  </p>
                )}

                {!isAdmin && (
                  <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                    <div className="flex gap-2">
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
                      <button
                        onClick={() => {
                          setPwForId(pwForId === u.id ? null : u.id);
                          setPwValue('');
                        }}
                        className="h-11 shrink-0 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 text-sm font-semibold text-amber-300 transition hover:bg-amber-400/20"
                        title="重置密码（管理员只能设置新密码，无法查看原密码）"
                      >
                        🔑 重置密码
                      </button>
                      <button
                        onClick={() => {
                          setQuotaForId(quotaForId === u.id ? null : u.id);
                          setQuotaValue(String(u.quota_mb ?? 50));
                        }}
                        className="h-11 shrink-0 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/20"
                        title="调整存储配额（MB）"
                      >
                        ⚖ 配额
                      </button>
                    </div>

                    {/* 内联密码重置表单 */}
                    <AnimatePresence initial={false}>
                      {pwForId === u.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 32 }}
                          className="overflow-hidden"
                        >
                          <div className="flex gap-2 pt-1">
                            <input
                              type="text"
                              className="glass h-11 min-w-0 flex-1 rounded-lg px-3 text-sm text-slate-100 outline-none focus:border-amber-400/60"
                              placeholder={`为 ${u.email} 设置新密码（至少 6 位）`}
                              value={pwValue}
                              onChange={(e) => setPwValue(e.target.value)}
                              autoComplete="off"
                            />
                            <button
                              onClick={() => resetPassword(u)}
                              disabled={pwBusy}
                              className="h-11 shrink-0 rounded-lg bg-amber-500/90 px-4 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-50"
                            >
                              确认重置
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* 内联配额调整表单 */}
                    <AnimatePresence initial={false}>
                      {quotaForId === u.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 32 }}
                          className="overflow-hidden"
                        >
                          <div className="flex gap-2 pt-1">
                            <input
                              type="number"
                              min={1}
                              max={10240}
                              className="glass h-11 min-w-0 flex-1 rounded-lg px-3 text-sm text-slate-100 outline-none focus:border-cyan-400/60"
                              placeholder="新配额（MB，1-10240）"
                              value={quotaValue}
                              onChange={(e) => setQuotaValue(e.target.value)}
                            />
                            <button
                              onClick={() => saveQuota(u)}
                              disabled={quotaBusy}
                              className="h-11 shrink-0 rounded-lg bg-cyan-500/90 px-4 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-50"
                            >
                              确认调整
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
