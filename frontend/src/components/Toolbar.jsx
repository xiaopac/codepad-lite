import { useAuthStore } from '../store/authStore';
import { useProjectStore, selectCurrentFile } from '../store/projectStore';
import { useEditorStore } from '../store/editorStore';
import { useUiStore } from '../store/uiStore';
import { languageFromName } from '../utils/language';

export default function Toolbar({ projectName, onBack, onToggleSidebar }) {
  const user = useAuthStore((s) => s.user);
  const file = useProjectStore(selectCurrentFile);
  const fontSize = useEditorStore((s) => s.fontSize);
  const setFontSize = useEditorStore((s) => s.setFontSize);
  const running = useUiStore((s) => s.running);
  const runCode = useUiStore((s) => s.runCode);

  const canRun = Boolean(file) && Boolean(languageFromName(file?.name)) && !running;

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

      {/* 渐变圆环头像 */}
      <div className="hidden shrink-0 items-center gap-2 lg:flex">
        <div
          className="rounded-full p-[2px]"
          style={{ background: 'conic-gradient(from 180deg, #00f0ff, #0088ff, #a855f7, #00f0ff)' }}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0d0d16] text-sm font-bold text-cyan-200">
            {(user?.email || '?').slice(0, 1).toUpperCase()}
          </span>
        </div>
        <span className="max-w-[96px] truncate text-sm text-slate-300">{user?.email}</span>
      </div>

      <button
        onClick={handleLogout}
        className="flex h-11 shrink-0 items-center rounded-lg px-2 text-sm text-slate-400 transition hover:bg-white/10 hover:text-cyan-200"
      >
        退出
      </button>
    </header>
  );
}
