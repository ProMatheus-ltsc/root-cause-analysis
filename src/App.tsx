/**
 * 路由表：登录页独立于认证态；其余页面在 RequireAuth 内渲染。
 * 使用 HashRouter：GitHub Pages 为纯静态托管，BrowserRouter 的内部路由
 * （如 /new、/form/:id）在刷新时会请求服务器路径导致 404；Hash 路由
 * （/#/new）刷新不会向服务器发请求，规避该问题。
 */
import { Suspense, lazy, type ReactNode } from 'react';
import { HashRouter, Link, Navigate, NavLink, Outlet, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider } from './hooks/AuthProvider';
import { useAuth } from './hooks/useAuth';
import { ToastProvider } from './hooks/ToastProvider';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProblemPage = lazy(() => import('./pages/ProblemPage'));
const FormPage = lazy(() => import('./pages/FormPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const DataPage = lazy(() => import('./pages/DataPage'));
const ProblemWizardPage = lazy(() => import('./pages/ProblemWizardPage'));
const ProblemEditPage = lazy(() => import('./pages/ProblemEditPage'));

function FullScreenLoading() {
  return <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">加载中…</div>;
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { account, initializing } = useAuth();
  if (initializing) return <FullScreenLoading />;
  if (!account) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function TopNav() {
  const { account, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const linkClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'text-brand-600 font-medium' : 'text-text-secondary hover:text-text-primary transition-colors');

  return (
    <header className="no-print sticky top-0 z-40 border-b border-surface-200 bg-surface-0/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-text-primary">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-xs text-white">R</span>
          根因分析
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <NavLink to="/" end className={linkClass}>
            仪表盘
          </NavLink>
          <NavLink to="/history" className={linkClass}>
            历史记录
          </NavLink>
          <NavLink to="/data" className={linkClass}>
            数据管理
          </NavLink>
          <button
            onClick={() => navigate('/history')}
            className="rounded-lg border border-surface-200 bg-surface-50 px-2.5 py-1.5 text-text-tertiary hover:border-brand-300 hover:text-brand-600 transition"
            title="全局搜索 (⌘K)"
            aria-label="全局搜索"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <span className="ml-1.5 hidden sm:inline text-xs">搜索</span>
          </button>
          <span className="text-text-tertiary text-xs">{account?.username}</span>
          <button onClick={handleLogout} className="rounded-md px-2 py-1 text-xs text-danger hover:bg-red-50 transition">
            登出
          </button>
        </nav>
      </div>
    </header>
  );
}

function AppShell() {
  return (
    <div className="min-h-screen bg-surface-50">
      <TopNav />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <AuthProvider>
          <Suspense fallback={<FullScreenLoading />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                element={
                  <RequireAuth>
                    <AppShell />
                  </RequireAuth>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="new" element={<ProblemWizardPage />} />
                <Route path="problem/:problemId" element={<ProblemPage />} />
                <Route path="problem/:problemId/edit" element={<ProblemEditPage />} />
                <Route path="analysis/:problemId/:templateId/:recordId?" element={<FormPage />} />
                <Route path="history" element={<HistoryPage />} />
                <Route path="data" element={<DataPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ToastProvider>
    </HashRouter>
  );
}
