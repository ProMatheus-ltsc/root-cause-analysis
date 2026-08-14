/**
 * 路由表：登录页独立于认证态；其余页面在 RequireAuth 内渲染。
 * 使用 HashRouter：GitHub Pages 为纯静态托管，BrowserRouter 的内部路由
 * （如 /new、/form/:id）在刷新时会请求服务器路径导致 404；Hash 路由
 * （/#/new）刷新不会向服务器发请求，规避该问题。
 * 组件组织：App 是根组件，负责搭好路由骨架；AppShell 提供统一布局（顶栏+内容区），
 * 需要登录的页面都渲染在 AppShell 内部。
 */
import { Suspense, lazy, useState, useEffect, type ReactNode } from 'react';
import { HashRouter, Link, Navigate, NavLink, Outlet, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider } from './hooks/AuthProvider';
import { useAuth } from './hooks/useAuth';
import { ToastProvider } from './hooks/ToastProvider';
import { SearchSpotlight } from './components/SearchSpotlight';

// 用 lazy + Suspense 做路由级代码分割：每个页面独立打包，首次进入时才加载对应文件，
// 避免首屏一次下载全部页面代码。配合 Suspense 的 fallback 在加载期间显示加载态。
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProblemPage = lazy(() => import('./pages/ProblemPage'));
const FormPage = lazy(() => import('./pages/FormPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const DataPage = lazy(() => import('./pages/DataPage'));
const ProblemWizardPage = lazy(() => import('./pages/ProblemWizardPage'));
const ProblemEditPage = lazy(() => import('./pages/ProblemEditPage'));
const SeedPage = lazy(() => import('./pages/SeedPage'));

// 内部组件：懒加载页面尚未就绪时（以及应用初始化中）显示的全屏加载占位
function FullScreenLoading() {
  return <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">加载中…</div>;
}

// 内部组件：认证守卫。包裹需要登录才能访问的页面——
// 未登录且初始化完成时重定向到 /login；正在初始化时先显示加载态，避免登录态闪烁
function RequireAuth({ children }: { children: ReactNode }) {
  const { account, initializing } = useAuth();
  if (initializing) return <FullScreenLoading />;
  if (!account) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// 内部组件：登录后的顶部导航栏（品牌、菜单、全局搜索入口、当前用户名、登出按钮）
function TopNav() {
  const { account, logout } = useAuth();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);

  // ⌘K / Ctrl+K 快捷键打开搜索弹窗
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 登出后跳回登录页：replace 替换当前历史记录，用户按"返回"不会回到已登出的页面
  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  // NavLink 会把 isActive 传入 className 回调：当前激活的菜单项高亮，其余显示普通色
  const linkClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'text-brand-600 font-medium' : 'text-text-secondary hover:text-text-primary transition-colors');

  return (
    <>
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
              onClick={() => setSearchOpen(true)}
              className="rounded-lg border border-surface-200 bg-surface-50 px-2.5 py-1.5 text-text-tertiary hover:border-brand-300 hover:text-brand-600 transition"
              title="全局搜索 (⌘K)"
              aria-label="全局搜索"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
              <span className="ml-1.5 hidden sm:inline text-xs">搜索</span>
              <kbd className="ml-1.5 hidden sm:inline rounded border border-surface-200 bg-surface-100 px-1 py-0.5 text-[10px]">⌘K</kbd>
            </button>
            <span className="text-text-tertiary text-xs">{account?.username}</span>
            <button onClick={handleLogout} className="rounded-md px-2 py-1 text-xs text-danger hover:bg-red-50 transition">
              登出
            </button>
          </nav>
        </div>
      </header>
      <SearchSpotlight open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

// 内部组件：登录后的整体布局外壳——顶部是 TopNav，下方 main 里渲染当前路由页面（Outlet 占位）
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

/**
 * 根组件：组装路由与全局 Provider。
 * Provider 层级：ToastProvider（全局提示）> AuthProvider（登录态）> 路由。
 * 注意 HashRouter 在最外层，确保所有路由相关 hook 都在其上下文中调用。
 */
export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <AuthProvider>
          {/* Suspense 兜住所有 lazy 页面的加载态 */}
          <Suspense fallback={<FullScreenLoading />}>
            <Routes>
              {/* 登录页：不需要登录即可访问，独立于 RequireAuth 之外 */}
              <Route path="/login" element={<LoginPage />} />
              {/* 测试数据一键导入（开发/验收用，独立于认证态） */}
              <Route path="dev/seed" element={<SeedPage />} />
              {/* 受保护路由：用一个无 path 的父路由承载 RequireAuth + AppShell，
                  子路由全部嵌套在其内部，这样只有登录用户才能到达 */}
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
              {/* 兜底：未匹配任何路由时重定向回首页 */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ToastProvider>
    </HashRouter>
  );
}
