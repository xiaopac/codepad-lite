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
import WikiButton from './components/Wiki/WikiButton';

// 代码分割：低频页面懒加载
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const EnvironmentsView = lazy(() => import('./components/EnvironmentsView'));
const ProfilePanel = lazy(() => import('./components/ProfilePanel'));
// Wiki 侧边栏体积较大（react-markdown + highlight.js），点击图标时才加载
const WikiSidebar = lazy(() => import('./components/Wiki/WikiSidebar'));

// 路由级页面转场：滑动淡入（仅 opacity/transform，iPad 上 GPU 合成流畅）
const pageTransition = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.24, ease: 'easeOut' },
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

// ── 路由出口：AnimatePresence 包裹，页面切换时旧页淡出左滑、新页右滑淡入 ──
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
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
              <Page>
                <ProjectArea />
              </Page>
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
    </AnimatePresence>
  );
}

export default function App() {
  useVisualViewportHeight();

  const token = useAuthStore((s) => s.token);
  const boot = useAuthStore((s) => s.boot);
  const profileOpen = useUiStore((s) => s.profileOpen);
  const setProfileOpen = useUiStore((s) => s.setProfileOpen);
  // 站内 Wiki：贯穿全站（不记忆打开状态，仅记忆拖拽位置）
  const [wikiOpen, setWikiOpen] = useState(false);

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
          <AnimatedRoutes />

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

          {/* 站内 Wiki 书签：可拖拽图标（全站可用）＋ 可拖拽/缩放的自由窗口 */}
          <WikiButton open={wikiOpen} onTap={() => setWikiOpen((v) => !v)} />
          <Suspense fallback={null}>
            <WikiSidebar open={wikiOpen} onClose={() => setWikiOpen(false)} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </BrowserRouter>
  );
}
