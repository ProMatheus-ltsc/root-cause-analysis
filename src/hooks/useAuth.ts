/**
 * 认证 Context 与 hook。Provider 组件拆在同目录 AuthProvider.tsx 里，让本文件只导出
 * 非组件值，避免触发 React Fast Refresh 的 only-export-components 警告。
 */
import { createContext, useContext } from 'react';
import type { Account } from '../types';

export const AUTH_STORAGE_KEY = 'rca-current-account-id';

export interface AuthContextValue {
  account: Account | null;
  usernames: string[];
  initializing: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  resetPassword: (username: string, newPassword: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
