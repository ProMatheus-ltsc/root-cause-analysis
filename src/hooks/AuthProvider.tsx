/**
 * 认证 Provider：账户注册/登录/登出/忘记密码重置，登录态通过 localStorage 记录当前账户 id
 * 以便刷新后自动恢复。
 */
import { useEffect, useState, type ReactNode } from 'react';
import type { Account } from '../types';
import { listAccounts, setCurrentAccountId } from '../services/db';
import { registerAccount, resetAccountPassword, verifyAccountPassword } from '../services/auth';
import { AUTH_STORAGE_KEY, AuthContext } from './useAuth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [usernames, setUsernames] = useState<string[]>([]);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    (async () => {
      const accounts = await listAccounts();
      setUsernames(accounts.map((a) => a.username));
      const savedId = localStorage.getItem(AUTH_STORAGE_KEY);
      const found = savedId ? accounts.find((a) => a.id === savedId) : undefined;
      if (found) {
        setCurrentAccountId(found.id);
        setAccount(found);
      }
      setInitializing(false);
    })();
  }, []);

  function activateAccount(next: Account) {
    setCurrentAccountId(next.id);
    localStorage.setItem(AUTH_STORAGE_KEY, next.id);
    setAccount(next);
  }

  const login = async (username: string, password: string) => {
    const found = await verifyAccountPassword(username, password);
    if (!found) throw new Error('用户名或密码错误');
    activateAccount(found);
  };

  const register = async (username: string, password: string) => {
    const created = await registerAccount(username, password);
    activateAccount(created);
    setUsernames((prev) => [...prev, created.username]);
  };

  const resetPassword = async (username: string, newPassword: string) => {
    const updated = await resetAccountPassword(username, newPassword);
    activateAccount(updated);
  };

  const logout = () => {
    setCurrentAccountId(undefined);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAccount(null);
  };

  return (
    <AuthContext.Provider value={{ account, usernames, initializing, login, register, resetPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
