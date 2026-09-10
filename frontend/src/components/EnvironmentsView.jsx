import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../api/client';
import { toast } from '../store/toastStore';
import BuildLogModal from './BuildLogModal';

const VERSIONS = ['3.9', '3.10', '3.11'];

const STATUS_META = {
  building: { label: '构建中', badge: 'border-cyan-400/40 bg-cyan-400/15 text-cyan-300' },
  ready: { label: '就绪', badge: 'border-emerald-400/40 bg-emerald-400/15 text-emerald-300' },
  failed: { label: '构建失败', badge: 'border-rose-400/40 bg-rose-400/15 text-rose-300' },
};

const INPUT_CLS =
  'glass h-11 w-full rounded-lg px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/60';

// 高级选项折叠面板（创建与编辑共用）：自定义 pip 参数 + 安全警告
function AdvancedPanel({ value, onChange, open, onToggle }) {
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex h-10 items-center gap-1.5 rounded-lg px-2 text-xs text-slate-400 transition hover:bg-white/5 hover:text-cyan-200"
      >
        ⚙️ 高级选项（自定义 pip 参数）{open ? '▲' : '▼'}
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
            <p className="mb-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] leading-relaxed text-amber-300">
              ⚠️ 安全警告：高级参数将拼接到 pip install 命令中，仅允许 pip
              选项（如 --pre、--index-url=https://…、--extra-index-url=…、--upgrade）。
              参数不当可能导致构建失败，请自行承担风险。
            </p>
            <input
              className={INPUT_CLS}
              placeholder={'如：--pre --extra-index-url=https://pypi.example.com/simple'}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              maxLength={500}
            />
            <p className="mt-1 text-[10px] text-slate-600">
              留空则使用默认参数；镜像源自动切换仅在你未指定 --index-url 时生效
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 自定义 Python 环境管理：版本选择 + 第三方库安装 + 智能构建（换源重试/详细日志/高级模式）
export default function EnvironmentsView({ onBack }) {
  const [envs, setEnvs] = useState(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [version, setVersion] = useState('3.11');
  const [packagesText, setPackagesText] = useState('');
  const [customCmd, setCustomCmd] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // 编辑态
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPackages, setEditPackages] = useState('');
  const [editCustom, setEditCustom] = useState('');
  const [editAdvanced, setEditAdvanced] = useState(false);
  const [editBusy, setEditBusy] = useState(false);

  const [logEnv, setLogEnv] = useState(null); // 日志弹窗
  const delTimer = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await api('/api/environments');
      setEnvs(data.environments);
      setError('');
    } catch (err) {
      setError(err.message || '加载失败');
    }
  }, []);

  useEffect(() => {
    load();
    return () => clearTimeout(delTimer.current);
  }, [load]);

  // 有环境在构建时每 4 秒轮询（同步刷新弹窗中已打开环境的日志）
  useEffect(() => {
    if (!envs || !envs.some((e) => e.status === 'building')) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [envs, load]);

  // 弹窗环境跟随轮询数据更新
  useEffect(() => {
    if (logEnv && envs) {
      const fresh = envs.find((e) => e.id === logEnv.id);
      if (fresh && fresh.build_log !== logEnv.build_log) setLogEnv(fresh);
    }
  }, [envs, logEnv]);

  const parsePackages = (text) =>
    text
      .split(/[\n,，\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);

  const submitCreate = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await api('/api/environments', {
        method: 'POST',
        body: {
          name: name.trim(),
          python_version: version,
          packages: parsePackages(packagesText),
          build_command: customCmd.trim(),
        },
      });
      toast.success('环境已创建，正在后台构建…');
      setName('');
      setPackagesText('');
      setCustomCmd('');
      setAdvancedOpen(false);
      setCreating(false);
      load();
    } catch (err) {
      toast.error(err.message || '创建失败');
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (env) => {
    setEditingId(env.id);
    setEditName(env.name);
    setEditPackages(env.packages.join('\n'));
    setEditCustom(env.build_command_custom || '');
    setEditAdvanced(Boolean(env.build_command_custom));
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (editBusy) return;
    setEditBusy(true);
    try {
      await api(`/api/environments/${editingId}`, {
        method: 'PUT',
        body: {
          name: editName.trim(),
          packages: parsePackages(editPackages),
          build_command: editCustom.trim(),
        },
      });
      toast.success('已保存，正在重新构建…');
      setEditingId(null);
      load();
    } catch (err) {
      toast.error(err.message || '保存失败');
    } finally {
      setEditBusy(false);
    }
  };

  const rebuild = async (env) => {
    try {
      await api(`/api/environments/${env.id}/rebuild`, { method: 'POST' });
      toast.success('正在重新构建…');
      load();
    } catch (err) {
      toast.error(err.message || '操作失败');
    }
  };

  const startDelete = (id) => {
    setDeletingId(id);
    clearTimeout(delTimer.current);
    delTimer.current = setTimeout(() => setDeletingId(null), 3000);
  };

  const doDelete = async (env) => {
    try {
      await api(`/api/environments/${env.id}`, { method: 'DELETE' });
      toast.success(`已删除「${env.name}」`);
      setDeletingId(null);
      load();
    } catch (err) {
      toast.error(err.message || '删除失败');
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="glass-strong flex h-14 shrink-0 items-center gap-2 border-x-0 border-t-0 px-3">
        <button
          onClick={onBack}
          className="flex h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-sm text-slate-400 transition hover:bg-white/10 hover:text-cyan-200"
        >
          <span className="text-lg leading-none">←</span> 返回
        </button>
        <span className="neon-text text-base font-semibold tracking-wider">🐍 Python 环境</span>
        <button
          onClick={() => setCreating((v) => !v)}
          className="ml-auto flex h-11 items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 px-4 text-sm font-semibold text-white shadow-neon-cyan"
        >
          ＋ 新建环境
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto scroll-touch p-4">
        <div className="mx-auto max-w-3xl">
          {/* 与终端沙箱的区别提示（终端跑在独立沙箱镜像里，不读这里的环境） */}
          <p className="mb-4 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-[11px] leading-relaxed text-cyan-100/85">
            这里配置的环境只用于 <b>▶ 运行</b>（批量执行）。
            <b>💻 终端运行</b> 跑在独立沙箱镜像里，Python 与预装库由镜像固定、与此处无关；
            终端面板里的「ⓘ 沙箱」可查看终端实际可用的库。
          </p>

          {/* 新建环境表单 */}
          <AnimatePresence initial={false}>
            {creating && (
              <motion.form
                onSubmit={submitCreate}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 32 }}
                className="overflow-hidden"
              >
                <div className="glass mb-4 rounded-2xl p-4">
                  <input
                    className={INPUT_CLS}
                    placeholder="环境名称，如 AI项目 / 游戏开发"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={30}
                    required
                  />
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-slate-500">Python 版本</span>
                    {VERSIONS.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setVersion(v)}
                        className={`flex h-11 flex-1 items-center justify-center rounded-lg text-sm transition ${
                          version === v
                            ? 'border border-cyan-400/60 bg-cyan-400/15 font-semibold text-cyan-200 shadow-neon-cyan'
                            : 'border border-white/10 bg-white/5 text-slate-400'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="glass mt-3 h-24 w-full resize-none rounded-lg p-3 text-sm text-slate-100 outline-none focus:border-cyan-400/60"
                    placeholder={'第三方库，每行一个，如：\nnumpy\npygame\nrequests'}
                    value={packagesText}
                    onChange={(e) => setPackagesText(e.target.value)}
                  />
                  <AdvancedPanel
                    value={customCmd}
                    onChange={setCustomCmd}
                    open={advancedOpen}
                    onToggle={() => setAdvancedOpen((v) => !v)}
                  />
                  <p className="mt-1 text-[10px] text-slate-600">
                    构建需下载包（约 1-3 分钟），网络失败会自动切换国内镜像源重试，构建期间可正常使用其他环境
                  </p>
                  <button
                    type="submit"
                    disabled={busy || !name.trim()}
                    className="mt-3 h-12 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-base font-semibold text-white shadow-neon-cyan disabled:opacity-50"
                  >
                    {busy ? '提交中…' : '创建并开始构建'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {error && (
            <p className="mb-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {error}
            </p>
          )}

          {!envs ? (
            <p className="py-10 text-center text-sm text-slate-500">加载中…</p>
          ) : (
            <div className="space-y-3">
              {envs.map((env) => {
                const meta = STATUS_META[env.status] || STATUS_META.building;
                const editing = editingId === env.id;
                return (
                  <div key={env.id} className="glass rounded-2xl p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100">
                        🐍 {env.name}
                      </span>
                      <span className="rounded-full border border-cyan-400/40 bg-cyan-400/15 px-2.5 py-0.5 text-xs text-cyan-300">
                        Python {env.python_version}
                      </span>
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs ${meta.badge}`}>
                        {env.status === 'building' ? '◌ 构建中…' : meta.label}
                      </span>
                    </div>

                    {env.packages.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {env.packages.map((p) => (
                          <span
                            key={p}
                            className="rounded-full border border-purple-400/30 bg-purple-400/10 px-2 py-0.5 text-[11px] text-purple-300"
                          >
                            📦 {p}
                          </span>
                        ))}
                      </div>
                    )}

                    {env.build_command_custom && (
                      <p className="mt-2 truncate rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-1.5 text-[11px] text-amber-200/80">
                        ⚙️ 自定义参数：{env.build_command_custom}
                      </p>
                    )}

                    {env.status === 'failed' && env.error && (
                      <p className="mt-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs leading-relaxed text-rose-300">
                        ✗ {env.error}
                      </p>
                    )}

                    {/* 编辑表单（保存后自动重建） */}
                    <AnimatePresence initial={false}>
                      {editing && (
                        <motion.form
                          onSubmit={submitEdit}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 32 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 rounded-xl border border-cyan-400/20 bg-[#0b0b14] p-3">
                            <input
                              className={INPUT_CLS}
                              placeholder="环境名称"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              maxLength={30}
                              required
                            />
                            <textarea
                              className="glass mt-2 h-20 w-full resize-none rounded-lg p-3 text-sm text-slate-100 outline-none focus:border-cyan-400/60"
                              placeholder={'第三方库，每行一个'}
                              value={editPackages}
                              onChange={(e) => setEditPackages(e.target.value)}
                            />
                            <AdvancedPanel
                              value={editCustom}
                              onChange={setEditCustom}
                              open={editAdvanced}
                              onToggle={() => setEditAdvanced((v) => !v)}
                            />
                            <div className="mt-3 flex gap-2">
                              <button
                                type="submit"
                                disabled={editBusy || !editName.trim()}
                                className="h-11 flex-1 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 text-sm font-semibold text-white shadow-neon-cyan disabled:opacity-50"
                              >
                                {editBusy ? '保存中…' : '保存并重建'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="h-11 rounded-lg bg-white/5 px-4 text-sm text-slate-400 hover:bg-white/10"
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        </motion.form>
                      )}
                    </AnimatePresence>

                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
                      {env.build_log && (
                        <button
                          onClick={() => setLogEnv(env)}
                          className="flex h-11 items-center gap-1.5 rounded-lg bg-white/5 px-3 text-xs text-slate-300 transition hover:bg-white/10 hover:text-cyan-200"
                        >
                          📜 查看详细日志
                        </button>
                      )}
                      <button
                        onClick={() => (editing ? setEditingId(null) : startEdit(env))}
                        disabled={env.status === 'building'}
                        className="flex h-11 items-center gap-1.5 rounded-lg bg-white/5 px-3 text-xs text-slate-300 transition hover:bg-white/10 hover:text-cyan-200 disabled:opacity-40"
                      >
                        ✏️ {editing ? '收起' : '编辑'}
                      </button>
                      <span className="flex-1" />
                      <button
                        onClick={() => rebuild(env)}
                        disabled={env.status === 'building'}
                        className="h-11 rounded-lg bg-gradient-to-r from-purple-500 to-cyan-400 px-4 text-sm font-semibold text-white shadow-neon-purple transition disabled:opacity-40"
                      >
                        ↻ {env.status === 'failed' ? '重新构建' : '重建'}
                      </button>
                      {deletingId === env.id ? (
                        <button
                          onClick={() => doDelete(env)}
                          className="h-11 shrink-0 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white"
                        >
                          确认删除?
                        </button>
                      ) : (
                        <button
                          onClick={() => startDelete(env.id)}
                          className="h-11 shrink-0 rounded-lg border border-rose-400/40 bg-rose-500/10 px-4 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/25"
                        >
                          🗑 删除
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 构建日志弹窗（错误行高亮 / 复制 / 策略可见） */}
      <AnimatePresence>
        {logEnv && <BuildLogModal env={logEnv} onClose={() => setLogEnv(null)} />}
      </AnimatePresence>
    </div>
  );
}
