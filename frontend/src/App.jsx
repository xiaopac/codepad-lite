import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from './store/authStore';
import { useProjectStore } from './store/projectStore';
import { useVisualViewportHeight } from './hooks/useVisualViewport';
import AuthPage from './components/AuthPage';
import ProjectListView from './components/ProjectListView';
import Workspace from './components/Workspace';
import ToastContainer from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';

// 代码分割（需求 2.6）：低频页面懒加载，减小首屏体积
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const EnvironmentsView = lazy(() => import('./components/EnvironmentsView'));
const ProfilePanel = lazy(() => import('./components/ProfilePanel'));

// 路由级页面转场：淡入 + 上移（GPU 友好：opacity/transform）
const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -14 },
  transition: { duration: 0.26, ease: 'easeOut' },
};

function Page({ children }) {
  return (
    <motion.div className="flex min-h-0 flex-1 flex-col" {...pageTransition}>
      {children}
    </motion.div>
  );
}

function SuspenseFallback() {
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
      加载中…
    </div>
  );
}

export default function App() {
  // iPad 软键盘弹出/收起时同步可视高度（配合 Monaco automaticLayout 防遮挡）
  useVisualViewportHeight();

  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const boot = useAuthStore((s) => s.boot);
  const currentProject = useProjectStore((s) => s.currentProject);
  const [adminOpen, setAdminOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [envOpen, setEnvOpen] = useState(false);

  // 有 token 时拉取当前用户信息（无效则自动登出）
  useEffect(() => {
    if (token) boot();
    else {
      setAdminOpen(false);
      setProfileOpen(false);
      setEnvOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const isAdmin = user?.role === 'admin';
  const view = !token
    ? 'auth'
    : adminOpen && isAdmin
      ? 'admin'
      : currentProject
        ? 'workspace'
        : envOpen
          ? 'environments'
          : 'projects';

  return (
    <div
      className="flex w-full flex-col overflow-hidden bg-cyber-bg text-slate-100"
      style={{ height: 'var(--app-height, 100dvh)' }}
    >
      <ErrorBoundary>
        <AnimatePresence mode="wait" initial={false}>
          {view === 'auth' && (
            <Page key="auth">
              <AuthPage />
            </Page>
          )}
          {view === 'projects' && (
            <Page key="projects">
              <ProjectListView
                onOpenAdmin={() => setAdminOpen(true)}
                onOpenProfile={() => setProfileOpen(true)}
                onOpenEnvironments={() => setEnvOpen(true)}
              />
            </Page>
          )}
          {view === 'workspace' && (
            <Page key="workspace">
              <Workspace
                onOpenProfile={() => setProfileOpen(true)}
                onOpenEnvironments={() => setEnvOpen(true)}
              />
            </Page>
          )}
          {view === 'environments' && (
            <Page key="environments">
              <Suspense fallback={<SuspenseFallback />}>
                <EnvironmentsView onBack={() => setEnvOpen(false)} />
              </Suspense>
            </Page>
          )}
          {view === 'admin' && (
            <Page key="admin">
              <Suspense fallback={<SuspenseFallback />}>
                <AdminDashboard onBack={() => setAdminOpen(false)} />
              </Suspense>
            </Page>
          )}
        </AnimatePresence>

        {/* 个人设置侧滑面板（懒加载） */}
        <AnimatePresence>
          {profileOpen && token && (
            <Suspense fallback={null}>
              <ProfilePanel onClose={() => setProfileOpen(false)} />
            </Suspense>
          )}
        </AnimatePresence>

        {/* 全局 Toast：从右侧滑入，停留 2 秒后淡出滑走 */}
        <ToastContainer />
      </ErrorBoundary>
    </div>
  );
}
