import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useProjectStore } from '../store/projectStore';
import Toolbar from './Toolbar';
import FileSidebar from './FileSidebar';
import EditorPane from './EditorPane';
import OutputPanel from './OutputPanel';

// 桌面端（md 及以上）侧栏常驻；移动端为滑入抽屉
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isDesktop;
}

export default function Workspace() {
  const project = useProjectStore((s) => s.currentProject);
  const closeProject = useProjectStore((s) => s.closeProject);
  const loadingFiles = useProjectStore((s) => s.loadingFiles);
  const autosaveError = useProjectStore((s) => s.autosaveError);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isDesktop = useIsDesktop();

  // 自动保存兜底：窗口失焦 / 切后台 / 页面关闭时保存（防 iPad 意外关闭丢内容）
  useEffect(() => {
    const save = () => {
      useProjectStore.getState().saveCurrent({ keepalive: true });
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') save();
    };
    window.addEventListener('blur', save);
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', save);
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const handleBack = async () => {
    try {
      await closeProject();
    } catch {
      /* 自动保存失败不阻塞返回 */
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Toolbar
        projectName={project?.name}
        onBack={handleBack}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      {autosaveError && (
        <div className="shrink-0 border-b border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-xs text-amber-300/90">
          ⚠ 自动保存失败：{autosaveError}（内容仍在编辑器中，请检查网络）
        </div>
      )}

      <div className="relative flex min-h-0 flex-1">
        {/* 文件侧栏：移动端弹簧滑入抽屉（GPU transform），桌面端常驻 */}
        <motion.aside
          initial={false}
          animate={isDesktop ? { x: 0 } : sidebarOpen ? { x: 0 } : { x: '-100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="glass-strong absolute inset-y-0 left-0 z-30 w-64 border-y-0 border-l-0 shadow-glass md:static md:border-0 md:shadow-none"
        >
          <FileSidebar onFileAction={() => setSidebarOpen(false)} />
        </motion.aside>

        <AnimatePresence>
          {sidebarOpen && !isDesktop && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {loadingFiles ? (
            <div className="flex flex-1 items-center justify-center bg-cyber-panel text-sm text-slate-500">
              正在打开项目…
            </div>
          ) : (
            <>
              <EditorPane />
              <OutputPanel />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
