/**
 * 登录/注册/忘记密码页：本地账户体系入口，成功后跳转到仪表盘。
 * "忘记密码"是本地纯前端架构下的折中方案：不校验旧密码（没有可信身份验证手段），
 * 只要输入正确的用户名即可设置新密码并直接登入，该账户下的历史记录不受影响。
 */
import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

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

const MODE_TITLE: Record<Mode, string> = {
  login: '登录本地账户',
  register: '创建本地账户',
  reset: '重置密码',
};

export default function LoginPage() {
  const { login, register, resetPassword, account } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (account) {
    return <Navigate to="/" replace />;
  }

  function switchMode(next: Mode) {
    setMode(next);
    setPassword('');
    setConfirmPassword('');
    setError('');
  }

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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-slate-900">根因分析系统</h1>
        <p className="mb-6 text-sm text-slate-500">{MODE_TITLE[mode]}</p>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-700">用户名</label>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="输入用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">{mode === 'reset' ? '新密码' : '密码'}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full rounded-md border border-slate-300 px-3 py-2 pr-10 text-sm"
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
              <p className="mt-1 text-xs text-amber-600">已输入 {password.length}/4 位，还需 {4 - password.length} 位</p>
            )}
          </div>
          {mode === 'reset' && (
            <div>
              <label className="mb-1 block text-sm text-slate-700">确认新密码</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 pr-10 text-sm"
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
                <p className="mt-1 text-xs text-rose-600">两次密码不一致</p>
              )}
            </div>
          )}
        </div>
        {mode === 'reset' && (
          <p className="mt-3 text-xs text-slate-400">
            本系统数据仅存于本地浏览器，无法验证旧密码；输入正确的用户名即可设置新密码并直接登入，历史记录不受影响。
          </p>
        )}
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        <button type="submit" className="mt-6 w-full rounded-md bg-sky-600 py-2 text-sm font-medium text-white hover:bg-sky-700">
          {mode === 'login' ? '登录' : mode === 'register' ? '注册' : '重置密码并登录'}
        </button>
        <div className="mt-3 flex flex-col items-center gap-2 text-sm">
          {mode === 'login' && (
            <>
              <button type="button" onClick={() => switchMode('register')} className="text-slate-500 hover:underline">
                没有账户？去注册
              </button>
              <button type="button" onClick={() => switchMode('reset')} className="text-slate-400 hover:underline">
                忘记密码？
              </button>
            </>
          )}
          {mode !== 'login' && (
            <button type="button" onClick={() => switchMode('login')} className="text-slate-500 hover:underline">
              已有账户？去登录
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
