/**
 * 认证 Provider：账户注册/登录/登出/忘记密码重置，登录态通过 localStorage 记录当前账户 id
 * 以便刷新后自动恢复。
 *
 * 扮演的角色：整个应用的"登录系统中枢"。它挂载在应用根部（包裹所有页面），
 * 持有"当前登录账户"这份全局状态，并通过 React Context 把
 * 登录、注册、登出等操作下发给任意深度的子组件使用。
 * 核心概念：登录状态 = 内存 state（当前会话） + IndexedDB 当前账户记录 + localStorage 账户 id（跨刷新持久化）。
 */
import { useEffect, useState, type ReactNode } from 'react';
import type { Account } from '../types';
import { listAccounts, setCurrentAccountId } from '../services/db';
import { registerAccount, resetAccountPassword, verifyAccountPassword } from '../services/auth';
import { AUTH_STORAGE_KEY, AuthContext } from './useAuth';

/**
 * AuthProvider 组件：接收子组件作为 children，并把"账户状态 + 认证操作"通过 Context 提供给它们。
 * 组件本身不渲染任何可见 UI，只负责管理状态和提供 API。
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // 当前登录的账户；null 表示尚未登录（或已登出）
  const [account, setAccount] = useState<Account | null>(null);
  // 所有已注册的用户名，供注册表单做"用户名是否已存在"的实时提示
  const [usernames, setUsernames] = useState<string[]>([]);
  // 应用启动时是否还在初始化：首次加载阶段为 true，UI 可据此显示 loading，避免登录状态闪烁
  const [initializing, setInitializing] = useState(true);

  // 组件挂载后只执行一次（依赖数组为空 []，相当于"应用启动时执行一次"）。
  // 目的：恢复上次的登录状态（自动登录）。刷新页面后 React 组件会重建，
  // 内存里的 account 丢失，因此要从 IndexedDB + localStorage 重新把登录态"捞"回来。
  useEffect(() => {
    // useEffect 的回调不能直接写成 async 函数，所以外面包一层"立即执行的异步函数"（async IIFE）
    (async () => {
      // 1. 从 IndexedDB 拉取全部账户，把用户名列表放进 state
      const accounts = await listAccounts();
      setUsernames(accounts.map((a) => a.username));
      // 2. 读取上次登录时写入 localStorage 的账户 id（登录/注册成功时由 activateAccount 写入）
      const savedId = localStorage.getItem(AUTH_STORAGE_KEY);
      // 3. 在账户列表里按 id 查找这个账户；如果找不到（例如账户已被删除）则保持未登录
      const found = savedId ? accounts.find((a) => a.id === savedId) : undefined;
      if (found) {
        // 找到就恢复登录态：把当前账户 id 记入 IndexedDB，并写入内存 state
        setCurrentAccountId(found.id);
        setAccount(found);
      }
      // 4. 初始化完成，通知 UI 隐藏 loading
      setInitializing(false);
    })();
  }, []);

  /**
   * 内部辅助函数：激活一个账户（登录、注册、重置密码成功后都会调用它）。
   * 它做三件配套的事，保证三处登录状态保持一致：
   *   1) 把账户 id 写入 IndexedDB（持久化的"当前账户"记录）；
   *   2) 把账户 id 写入 localStorage（刷新页面后据此自动登录）；
   *   3) 更新 React 内存 state，让界面立即切换到已登录状态。
   */
  function activateAccount(next: Account) {
    setCurrentAccountId(next.id);
    localStorage.setItem(AUTH_STORAGE_KEY, next.id);
    setAccount(next);
  }

  /** 登录：先用用户名 + 密码校验账户，通过后激活登录态；用户名或密码错误会抛异常由调用方提示 */
  const login = async (username: string, password: string) => {
    const found = await verifyAccountPassword(username, password);
    if (!found) throw new Error('用户名或密码错误');
    activateAccount(found);
  };

  /** 注册：创建新账户并直接登录（注册成功即视为已登录），再把新用户名追加进列表 */
  const register = async (username: string, password: string) => {
    const created = await registerAccount(username, password);
    activateAccount(created);
    setUsernames((prev) => [...prev, created.username]);
  };

  /** 忘记密码重置：重设密码后直接登录（重置成功即视为已登录，无需再走一次登录表单） */
  const resetPassword = async (username: string, newPassword: string) => {
    const updated = await resetAccountPassword(username, newPassword);
    activateAccount(updated);
  };

  /** 登出：同时清除 IndexedDB 与 localStorage 里的登录记录，并清空内存中的账户，回到未登录状态 */
  const logout = () => {
    setCurrentAccountId(undefined);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAccount(null);
  };

  // 通过 Context.Provider 把"状态 + 操作"注入整棵组件树：
  // 任意后代组件调用 useAuth() 即可拿到这里的 value，而不必一层层手动传 props。
  return (
    <AuthContext.Provider value={{ account, usernames, initializing, login, register, resetPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
