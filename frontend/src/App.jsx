import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from './store/authStore';
import { useProjectStore } from './store/projectStore';
import { useUiStore } from './store/uiStore';
import { useVisualViewportHeight } from './hooks/useVisualViewport';
import AuthPage from './components/AuthPage';
import ProjectListView from './components/ProjectListView';
import Workspace from './components/Workspace';
import MediaPreview from './components/MediaPreview';
import ToastContainer from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';

// 代码分割：低频页面懒加载
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
    <div className="flex flex-1 items-center justify-center text-sm text-slate-500">加载中…</div>
  );
}

// ── 路由守卫 ────────────────────────────────────────────
function RequireAuth({ children }) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  if (!token || !user || user.status !== 'active') return <Navigate to="/" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const user = useAuthStore((s) => s.user);
  if (user?.role !== 'admin') return <NotFound />; // 需求：非管理员显示 404
  return children;
}

function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="glass-strong w-full max-w-sm rounded-2xl p-8 text-center shadow-glass">
        <div className="gradient-text text-6xl font-bold">404</div>
        <p className="mt-4 font-semibold text-slate-200">页面不存在</p>
        <p className="mt-2 text-xs text-slate-500">你访问的地址可能已失效，或者你没有访问权限</p>
        <button
          onClick={() => navigate('/')}
          className="mt-6 h-12 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-base font-semibold text-white shadow-neon-cyan"
        >
          返回首页
        </button>
      </div>
    </div>
  );
}

// ── /project 工作区：项目列表 ↔ 编辑器 ↔ 环境管理 ──
function ProjectArea() {
  const currentProject = useProjectStore((s) => s.currentProject);
  const [envOpen, setEnvOpen] = useState(false);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {envOpen ? (
        <Page key="environments">
          <Suspense fallback={<SuspenseFallback />}>
            <EnvironmentsView onBack={() => setEnvOpen(false)} />
          </Suspense>
        </Page>
      ) : currentProject ? (
        <Page key="workspace">
          <Workspace onOpenEnvironments={() => setEnvOpen(true)} />
        </Page>
      ) : (
        <Page key="projects">
          <ProjectListView onOpenEnvironments={() => setEnvOpen(true)} />
        </Page>
      )}
    </AnimatePresence>
  );
}

// ── /admin 后台（返回指向工作区） ──
function AdminPage() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <AdminDashboard onBack={() => navigate('/project')} />
    </Suspense>
  );
}

// 路由切换时回到顶部
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  useVisualViewportHeight();

  const token = useAuthStore((s) => s.token);
  const boot = useAuthStore((s) => s.boot);
  const profileOpen = useUiStore((s) => s.profileOpen);
  const setProfileOpen = useUiStore((s) => s.setProfileOpen);

  // 有 token 时拉取当前用户信息（无效则自动登出）
  useEffect(() => {
    if (token) boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <div
        className="flex w-full flex-col overflow-hidden bg-cyber-bg text-slate-100"
        style={{ height: 'var(--app-height, 100dvh)' }}
      >
        <ErrorBoundary>
          <Routes>
            <Route
              path="/"
              element={
                <Page>
                  <AuthPage />
                </Page>
              }
            />
            <Route
              path="/project"
              element={
                <RequireAuth>
                  <ProjectArea />
                </RequireAuth>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireAuth>
                  <RequireAdmin>
                    <Page>
                      <AdminPage />
                    </Page>
                  </RequireAdmin>
                </RequireAuth>
              }
            />
            <Route
              path="*"
              element={
                <Page>
                  <NotFound />
                </Page>
              }
            />
          </Routes>

          {/* 个人设置侧滑面板（全局） */}
          <AnimatePresence>
            {profileOpen && token && (
              <Suspense fallback={null}>
                <ProfilePanel onClose={() => setProfileOpen(false)} />
              </Suspense>
            )}
          </AnimatePresence>

          {/* 媒体预览浮层（全局） */}
          <AnimatePresence>
            <MediaPreview />
          </AnimatePresence>

          <ToastContainer />
        </ErrorBoundary>
      </div>
    </BrowserRouter>
  );
}
