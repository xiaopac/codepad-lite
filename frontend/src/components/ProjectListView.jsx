import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import { useEditorStore } from '../store/editorStore';
import { useUiStore } from '../store/uiStore';
import { toast } from '../store/toastStore';

export default function ProjectListView({ onOpenEnvironments }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setProfileOpen = useUiStore((s) => s.setProfileOpen);
  const projects = useProjectStore((s) => s.projects);
  const loadingProjects = useProjectStore((s) => s.loadingProjects);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const createProject = useProjectStore((s) => s.createProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const openProject = useProjectStore((s) => s.openProject);

  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(null);
  const confirmTimer = useRef(null);

  useEffect(() => {
    fetchProjects().catch((err) => setError(err.message || '加载项目失败'));
    return () => clearTimeout(confirmTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    clearAuth();
    useProjectStore.getState().resetAll();
    useEditorStore.getState().reset();
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError('');
    try {
      await createProject(trimmed);
      toast.success(`项目「${trimmed}」已创建`);
      setName('');
    } catch (err) {
      setError(err.message || '创建失败');
    } finally {
      setBusy(false);
    }
  };

  const startConfirmDelete = (id) => {
    setConfirmingDelete(id);
    clearTimeout(confirmTimer.current);
    confirmTimer.current = setTimeout(() => setConfirmingDelete(null), 3000);
  };

  const handleDelete = async (id, projectName) => {
    setError('');
    try {
      await deleteProject(id);
      toast.success(`项目「${projectName}」已删除`);
      setConfirmingDelete(null);
    } catch (err) {
      setError(err.message || '删除失败');
    }
  };

  const handleOpen = async (project) => {
    setError('');
    try {
      await openProject(project);
    } catch (err) {
      setError(err.message || '打开项目失败');
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="glass-strong flex h-14 shrink-0 items-center justify-between border-x-0 border-t-0 px-4">
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="flex h-11 items-center gap-1 rounded-lg px-2 text-sm text-slate-400 transition hover:bg-white/10 hover:text-cyan-200"
            aria-label="返回首页"
          >
            <span className="text-lg leading-none">←</span> 返回首页
          </Link>
          <span className="neon-text text-xl">⚡</span>
          <span className="neon-text hidden font-semibold tracking-wider sm:inline">CodePad Lite</span>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="flex h-11 items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-500/25 to-cyan-400/25 px-3 text-sm text-purple-200 shadow-neon-purple transition hover:from-purple-500/45 hover:to-cyan-400/45"
            >
              🛡 管理后台
            </button>
          )}
          <button
            onClick={onOpenEnvironments}
            className="flex h-11 items-center gap-1.5 rounded-lg bg-white/5 px-3 text-sm text-slate-300 transition hover:bg-white/10 hover:text-cyan-200"
          >
            🧪 Python 环境
          </button>
          <div className="hidden items-center gap-1.5 sm:flex">
            <span className="text-base">{user?.avatar || '👤'}</span>
            <span className="max-w-[140px] truncate text-sm text-slate-300">
              {user?.nickname || user?.email}
            </span>
          </div>
          <button
            onClick={() => setProfileOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-lg text-slate-400 transition hover:bg-white/10 hover:text-cyan-200"
            aria-label="个人设置"
            title="个人设置"
          >
            ⚙
          </button>
          <button
            onClick={handleLogout}
            className="flex h-11 items-center rounded-lg px-3 text-sm text-slate-400 transition hover:bg-white/10 hover:text-cyan-200"
          >
            退出登录
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto scroll-touch">
        <div className="mx-auto max-w-5xl p-4 sm:p-6">
          <h2 className="neon-text text-xl font-semibold tracking-wider">我的项目</h2>
          <p className="mt-1 text-sm text-slate-400">
            每个项目是一个文件夹，里面可以放多个 .c / .cpp / .py 文件
          </p>

          <form onSubmit={submitCreate} className="mt-5 flex gap-2">
            <input
              className="glass h-12 min-w-0 flex-1 rounded-xl px-4 text-slate-100 outline-none transition focus:border-cyan-400/60 focus:shadow-neon-cyan"
              placeholder="新项目名称，如：算法练习"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="h-12 shrink-0 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 text-base font-semibold text-white shadow-neon-cyan transition hover:shadow-neon-cyan-lg disabled:opacity-50"
            >
              ＋ 创建
            </button>
          </form>

          {error && (
            <p className="mt-4 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {error}
            </p>
          )}

          {loadingProjects ? (
            <p className="mt-10 text-center text-sm text-slate-500">加载中…</p>
          ) : projects.length === 0 ? (
            <div className="mt-16 text-center">
              <div className="text-5xl drop-shadow-[0_0_18px_rgba(0,240,255,0.35)]">📁</div>
              <p className="mt-4 text-slate-400">还没有项目，创建第一个吧</p>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {projects.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.4), ease: 'easeOut' }}
                  className="glass rounded-2xl p-4 shadow-glass transition hover:border-cyan-400/40 hover:shadow-neon-cyan"
                >
                  <button
                    onClick={() => handleOpen(p)}
                    className="flex min-h-[44px] w-full items-center gap-3 text-left"
                  >
                    <span className="text-3xl drop-shadow-[0_0_12px_rgba(0,240,255,0.4)]">📁</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-100">{p.name}</span>
                      <span className="block text-xs text-slate-500">
                        创建于 {String(p.created_at || '').slice(0, 16)}
                      </span>
                    </span>
                    <span className="text-lg text-cyan-400/70">›</span>
                  </button>
                  <div className="mt-3 border-t border-white/10 pt-3">
                    {confirmingDelete === p.id ? (
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="h-11 w-full rounded-xl bg-rose-600 text-sm font-semibold text-white shadow-neon-purple"
                      >
                        再次点击确认删除（含其中所有文件）
                      </button>
                    ) : (
                      <button
                        onClick={() => startConfirmDelete(p.id)}
                        className="h-11 w-full rounded-xl bg-white/5 text-sm text-slate-400 transition hover:bg-rose-500/20 hover:text-rose-300"
                      >
                        🗑 删除项目
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
