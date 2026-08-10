/**
 * 路由表：登录页独立于认证态；其余页面在 RequireAuth 内渲染。
 */
import { Suspense, lazy, type ReactNode } from 'react';
import { BrowserRouter, Link, Navigate, NavLink, Outlet, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider } from './hooks/AuthProvider';
import { useAuth } from './hooks/useAuth';
import { ToastProvider } from './hooks/ToastProvider';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const FormPage = lazy(() => import('./pages/FormPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const DataPage = lazy(() => import('./pages/DataPage'));

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

  const linkClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'text-sky-600' : 'text-slate-600 hover:text-slate-900');

  return (
    <header className="no-print border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-lg font-semibold text-slate-900">
          根因分析系统
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <NavLink to="/" end className={linkClass}>
            仪表盘
          </NavLink>
          <NavLink to="/history" className={linkClass}>
            历史记录
          </NavLink>
          <NavLink to="/data" className={linkClass}>
            数据管理
          </NavLink>
          <span className="text-slate-400">{account?.username}</span>
          <button onClick={handleLogout} className="text-rose-600 hover:underline">
            登出
          </button>
        </nav>
      </div>
    </header>
  );
}

function AppShell() {
  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
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
                <Route path="form/:templateId/:recordId?" element={<FormPage />} />
                <Route path="history" element={<HistoryPage />} />
                <Route path="data" element={<DataPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
