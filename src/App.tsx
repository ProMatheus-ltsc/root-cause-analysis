/**
 * 路由表：登录页独立于认证态；其余页面在 RequireAuth 内渲染。
 * 使用 HashRouter：GitHub Pages 为纯静态托管，BrowserRouter 的内部路由
 * （如 /new、/form/:id）在刷新时会请求服务器路径导致 404；Hash 路由
 * （/#/new）刷新不会向服务器发请求，规避该问题。
 * 组件组织：App 是根组件，负责搭好路由骨架；AppShell 提供统一布局
 * （shared-core Layout：可折叠侧边栏 + 移动端 Drawer + 内容区），
 * 需要登录的页面都渲染在 AppShell 内部。
 * 全局搜索沿用 SearchSpotlight（检索记录/模板），⌘K 快捷键在 AppShell 层监听。
 */
import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import { HashRouter, Navigate, Outlet, Routes, Route, useNavigate } from 'react-router-dom';
import { Layout } from '@shared/core';
import { Database, GitBranch, History, LayoutDashboard } from 'lucide-react';
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

// 应用品牌配置（shared-core Layout 顶栏图标 + 名称）
const APP_CONFIG = {
  name: '根因分析',
  icon: GitBranch,
};

// 侧边栏导航（shared-core Layout 扁平导航，等价于单页组）
const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: '仪表盘', end: true },
  { to: '/history', icon: History, label: '历史记录' },
  { to: '/data', icon: Database, label: '数据管理' },
];

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

// 内部组件：登录后的整体布局外壳——shared-core Layout 统一 UI 风格
// （可折叠侧边栏 + 移动端 Drawer + 分组导航 + ⌘K）。
// 认证体系为项目自有 useAuth，通过 user/onLogout 注入，不依赖 shared-core AuthProvider。
function AppShell() {
  const { account, logout } = useAuth();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);

  // ⌘K / Ctrl+K 快捷键打开搜索弹窗（检索记录/模板的 SearchSpotlight）
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

  return (
    <>
      <Layout
        navItems={NAV_ITEMS}
        appConfig={APP_CONFIG}
        enableSearch={false}
        user={account ? { username: account.username } : null}
        onLogout={handleLogout}
      >
        <Outlet />
      </Layout>
      <SearchSpotlight open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
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
