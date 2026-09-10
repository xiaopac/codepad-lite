import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useProjectStore, selectCurrentFile } from '../store/projectStore';
import { useEditorStore } from '../store/editorStore';
import { useUiStore } from '../store/uiStore';
import { toast } from '../store/toastStore';
import { runLanguageFromName } from '../utils/language';

// ── 项目 Python 环境选择器（下拉） ──
function EnvSelector({ onOpenEnvironments }) {
  const environments = useProjectStore((s) => s.environments);
  const currentProject = useProjectStore((s) => s.currentProject);
  const bindEnvironment = useProjectStore((s) => s.bindEnvironment);
  const fetchEnvironments = useProjectStore((s) => s.fetchEnvironments);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    fetchEnvironments().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);

  const bound = environments.find((e) => e.id === currentProject?.environment_id);
  const label = bound ? `🐍 ${bound.name} · ${bound.python_version}` : '🐍 Python 环境';

  return (
    <div className="relative hidden shrink-0 sm:block" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 items-center gap-1.5 rounded-lg bg-white/5 px-3 text-xs text-slate-300 transition hover:bg-white/10"
        title="项目使用的 Python 环境"
      >
        <span className="max-w-[140px] truncate">{label}</span>
        <span className="text-slate-500">▾</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="glass-strong absolute right-0 top-12 z-40 w-64 rounded-xl p-2 shadow-glass"
          >
            <p className="px-2 py-1 text-[10px] tracking-wider text-slate-500">
              项目使用的 Python 环境
            </p>
            <div className="max-h-56 overflow-y-auto scroll-touch">
              {environments.map((e) => (
                <button
                  key={e.id}
                  disabled={e.status !== 'ready'}
                  onClick={() => {
                    bindEnvironment(currentProject.id, e.id)
                      .then(() => {
                        setOpen(false);
                        toast.success(`已切换到「${e.name}」`);
                      })
                      .catch((err) => toast.error(err.message || '切换失败'));
                  }}
                  className={`flex h-11 w-full items-center justify-between rounded-lg px-2 text-left text-sm transition disabled:opacity-40 ${
                    bound?.id === e.id
                      ? 'bg-cyan-400/15 text-cyan-200'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span className="truncate">{e.name}</span>
                  <span className="shrink-0 text-[10px] text-slate-500">
                    {e.python_version}
                    {e.status === 'building' ? ' · 构建中' : e.status === 'failed' ? ' · 失败' : ''}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setOpen(false);
                onOpenEnvironments?.();
              }}
              className="mt-1 flex h-11 w-full items-center justify-center gap-1 rounded-lg border border-dashed border-white/15 text-xs text-slate-400 transition hover:text-cyan-200"
            >
              🧪 管理环境
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Toolbar({ projectName, onBack, onToggleSidebar, onOpenEnvironments }) {
  const user = useAuthStore((s) => s.user);
  const file = useProjectStore(selectCurrentFile);
  const fontSize = useEditorStore((s) => s.fontSize);
  const setFontSize = useEditorStore((s) => s.setFontSize);
  const running = useUiStore((s) => s.running);
  const runCode = useUiStore((s) => s.runCode);
  const setProfileOpen = useUiStore((s) => s.setProfileOpen);
  const startTerminal = useUiStore((s) => s.startTerminal);
  const termStatus = useUiStore((s) => s.termStatus);
  const termRunning = ['starting', 'connecting', 'running'].includes(termStatus);

  // 仅 c / cpp / python 可运行（.txt 只读预览）
  const canRun = Boolean(file) && Boolean(runLanguageFromName(file?.name)) && !running;

  const handleLogout = () => {
    useAuthStore.getState().clearAuth();
    useProjectStore.getState().resetAll();
    useEditorStore.getState().reset();
  };

  return (
    <header className="glass-strong flex h-14 shrink-0 items-center gap-1 border-x-0 border-t-0 px-2 sm:gap-2 sm:px-3">
      <button
        onClick={onToggleSidebar}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xl text-slate-300 transition hover:bg-white/10 md:hidden"
        aria-label="切换文件列表"
      >
        ☰
      </button>

      <button
        onClick={onBack}
        className="flex h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-sm text-slate-400 transition hover:bg-white/10 hover:text-cyan-200"
        aria-label="返回项目列表"
      >
        <span className="text-lg leading-none">←</span>
        <span className="hidden sm:inline">项目</span>
      </button>

      {/* 霓虹发光 Logo + 项目名 */}
      <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
        <span className="neon-text shrink-0 text-base font-bold tracking-wider">⚡</span>
        <span className="min-w-0 truncate">
          <span className="neon-text block truncate text-sm font-semibold">{projectName}</span>
          {file && <span className="hidden truncate text-xs text-slate-500 sm:block">{file.name}</span>}
        </span>
      </div>

      {/* ▶ 运行按钮：紫→青霓虹渐变 + 呼吸光晕（44pt+，运行中禁用） */}
      <button
        onClick={runCode}
        disabled={!canRun}
        className="breathe-run flex h-12 min-w-[96px] shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-400 px-4 text-base font-bold text-white disabled:bg-none disabled:bg-slate-800 disabled:text-slate-500 sm:min-w-[108px]"
      >
        {running ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <span>运行中…</span>
          </>
        ) : (
          <>
            <span className="text-lg leading-none">▶</span>
            <span>运行</span>
          </>
        )}
      </button>

      {/* 💻 终端按钮：以交互终端运行当前文件（弹出底部终端面板）
          运行时保持可点：点击 = 重新展开面板（停止请用面板内 ⏹ 按钮） */}
      <button
        onClick={startTerminal}
        disabled={!canRun || running}
        className="relative flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-3 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/20 disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-500"
        title="以交互终端运行当前文件（可边运行边输入）"
      >
        💻 <span className="hidden sm:inline">终端运行</span>
        {termRunning && (
          <span
            className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400"
            style={{ boxShadow: '0 0 8px rgba(52,211,153,0.9)' }}
          />
        )}
      </button>

      {/* Python 环境选择器 */}
      <EnvSelector onOpenEnvironments={onOpenEnvironments} />

      {/* 字号调节（默认 16px，移动端友好） */}
      <div className="glass flex shrink-0 items-center rounded-xl">
        <button
          onClick={() => setFontSize(fontSize - 1)}
          disabled={fontSize <= 12}
          className="flex h-11 w-11 items-center justify-center rounded-l-xl text-sm font-bold text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
          aria-label="减小字号"
        >
          A−
        </button>
        <span className="hidden w-7 text-center text-xs text-cyan-300/80 sm:inline">{fontSize}</span>
        <button
          onClick={() => setFontSize(fontSize + 1)}
          disabled={fontSize >= 24}
          className="flex h-11 w-11 items-center justify-center rounded-r-xl text-base font-bold text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
          aria-label="增大字号"
        >
          A＋
        </button>
      </div>

      {/* 渐变圆环头像 + 昵称 */}
      <div className="hidden shrink-0 items-center gap-2 lg:flex">
        <div
          className="rounded-full p-[2px]"
          style={{ background: 'conic-gradient(from 180deg, #00f0ff, #0088ff, #a855f7, #00f0ff)' }}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0d0d16] text-base">
            {user?.avatar || (user?.email || '?').slice(0, 1).toUpperCase()}
          </span>
        </div>
        <span className="max-w-[96px] truncate text-sm text-slate-300">
          {user?.nickname || user?.email}
        </span>
      </div>

      {/* 个人设置齿轮 */}
      <button
        onClick={() => setProfileOpen(true)}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg text-slate-400 transition hover:bg-white/10 hover:text-cyan-200"
        aria-label="个人设置"
        title="个人设置"
      >
        ⚙
      </button>

      <button
        onClick={handleLogout}
        className="flex h-11 shrink-0 items-center rounded-lg px-2 text-sm text-slate-400 transition hover:bg-white/10 hover:text-cyan-200"
      >
        退出
      </button>
    </header>
  );
}
