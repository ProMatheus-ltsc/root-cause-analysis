/**
 * 登录/注册/忘记密码页（/login）：本地账户体系入口，成功后跳转到仪表盘。
 * "忘记密码"是本地纯前端架构下的折中方案：不校验旧密码（没有可信身份验证手段），
 * 只要输入正确的用户名即可设置新密码并直接登入，该账户下的历史记录不受影响。
 * 交互流程：三种模式（登录/注册/重置密码）共用同一个表单 → 提交时按当前模式调用对应的认证函数
 *   （异步读写 IndexedDB）→ 成功后跳回首页；已登录用户访问本页会被 <Navigate> 直接重定向回首页。
 * 核心概念：账户与数据都只存在浏览器本地（IndexedDB + localStorage），没有后端服务器参与认证。
 */
import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * 密码可见性切换按钮（密码框右侧的"小眼睛"）。
 * props：visible 当前是否明文显示；onToggle 点击后切换显示/隐藏状态。
 */
function PasswordToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm"
      aria-label={visible ? '隐藏密码' : '显示密码'}
    >
      {visible ? '🙈' : '👁'}
    </button>
  );
}

type Mode = 'login' | 'register' | 'reset';

/** 三种模式对应的表单标题文案 */
const MODE_TITLE: Record<Mode, string> = {
  login: '登录本地账户',
  register: '创建本地账户',
  reset: '重置密码',
};

/**
 * 登录页组件：提供登录 / 注册 / 重置密码三种模式，共用同一套表单。
 * props：无（路由页面，由 Router 直接渲染）。
 */
export default function LoginPage() {
  // useAuth 提供本地账户的登录/注册/重置密码函数，以及当前登录账户信息
  const { login, register, resetPassword, account } = useAuth();
  const navigate = useNavigate();
  // mode：当前模式；username/password/confirmPassword：表单输入；
  // error：提交失败时的错误提示文案；showPassword/showConfirmPassword：两个密码框的明文显示开关
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 已经登录（account 存在）时直接用 <Navigate> 重定向到首页，避免已登录用户还看到登录页
  if (account) {
    return <Navigate to="/" replace />;
  }

  /** 切换模式时清空密码与错误提示，避免残留上一种模式填的内容造成混淆。 */
  function switchMode(next: Mode) {
    setMode(next);
    setPassword('');
    setConfirmPassword('');
    setError('');
  }

  /**
   * 表单提交处理：preventDefault 阻止表单默认的整页刷新行为，再按当前模式调用对应认证函数。
   * 认证是异步操作（读写 IndexedDB），必须用 try/catch 捕获失败；
   * err instanceof Error 判断是为了安全取出 message，非 Error 对象则兜底显示"操作失败"。
   * 重置密码模式额外要求"新密码与确认密码一致"。
   */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'login') {
        await login(username, password);
      } else if (mode === 'register') {
        await register(username, password);
      } else {
        if (password !== confirmPassword) {
          setError('两次输入的新密码不一致');
          return;
        }
        await resetPassword(username, password);
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl border border-surface-200 bg-surface-0 p-8 shadow-lg shadow-brand-100/20 animate-slide-up">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">R</span>
          <h1 className="text-xl font-bold text-text-primary">根因分析系统</h1>
        </div>
        <p className="mb-7 text-sm text-text-tertiary">{MODE_TITLE[mode]}</p>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">用户名</label>
            <input
              className="w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-400 focus:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-100 transition"
              placeholder="输入用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">{mode === 'reset' ? '新密码' : '密码'}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-400 focus:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-100 transition"
                placeholder="至少 4 位"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={4}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />
            </div>
            {mode === 'register' && password.length > 0 && password.length < 4 && (
              <p className="mt-1.5 text-xs text-warning">已输入 {password.length}/4 位，还需 {4 - password.length} 位</p>
            )}
          </div>
          {mode === 'reset' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">确认新密码</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-400 focus:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-100 transition"
                  placeholder="再次输入新密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={4}
                  autoComplete="new-password"
                />
                <PasswordToggle visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((v) => !v)} />
              </div>
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <p className="mt-1.5 text-xs text-danger">两次密码不一致</p>
              )}
            </div>
          )}
        </div>
        {mode === 'reset' && (
          <p className="mt-3 text-xs text-text-tertiary leading-relaxed">
            本系统数据仅存于本地浏览器，无法验证旧密码；输入正确的用户名即可设置新密码并直接登入，历史记录不受影响。
          </p>
        )}
        {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
        <button type="submit" className="mt-7 w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-200 hover:bg-brand-700 transition">
          {mode === 'login' ? '登录' : mode === 'register' ? '注册' : '重置密码并登录'}
        </button>
        <div className="mt-4 flex flex-col items-center gap-2 text-sm">
          {mode === 'login' && (
            <>
              <button type="button" onClick={() => switchMode('register')} className="text-text-secondary hover:text-brand-600 transition">
                没有账户？去注册
              </button>
              <button type="button" onClick={() => switchMode('reset')} className="text-text-tertiary hover:text-text-secondary transition">
                忘记密码？
              </button>
            </>
          )}
          {mode !== 'login' && (
            <button type="button" onClick={() => switchMode('login')} className="text-text-secondary hover:text-brand-600 transition">
              已有账户？去登录
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
