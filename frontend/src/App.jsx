import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from './store/authStore';
import { useProjectStore } from './store/projectStore';
import { useVisualViewportHeight } from './hooks/useVisualViewport';
import AuthPage from './components/AuthPage';
import ProjectListView from './components/ProjectListView';
import Workspace from './components/Workspace';
import AdminDashboard from './components/AdminDashboard';
import ProfilePanel from './components/ProfilePanel';
import ToastContainer from './components/Toast';

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

export default function App() {
  // iPad 软键盘弹出/收起时同步可视高度（配合 Monaco automaticLayout 防遮挡）
  useVisualViewportHeight();

  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const boot = useAuthStore((s) => s.boot);
  const currentProject = useProjectStore((s) => s.currentProject);
  const [adminOpen, setAdminOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // 有 token 时拉取当前用户信息（无效则自动登出）
  useEffect(() => {
    if (token) boot();
    else {
      setAdminOpen(false);
      setProfileOpen(false);
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
        : 'projects';

  return (
    <div
      className="flex w-full flex-col overflow-hidden bg-cyber-bg text-slate-100"
      style={{ height: 'var(--app-height, 100dvh)' }}
    >
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
            />
          </Page>
        )}
        {view === 'workspace' && (
          <Page key="workspace">
            <Workspace onOpenProfile={() => setProfileOpen(true)} />
          </Page>
        )}
        {view === 'admin' && (
          <Page key="admin">
            <AdminDashboard onBack={() => setAdminOpen(false)} />
          </Page>
        )}
      </AnimatePresence>

      {/* 个人设置侧滑面板 */}
      <AnimatePresence>
        {profileOpen && token && <ProfilePanel onClose={() => setProfileOpen(false)} />}
      </AnimatePresence>

      {/* 全局 Toast：从右侧滑入，停留 2 秒后淡出滑走 */}
      <ToastContainer />
    </div>
  );
}
