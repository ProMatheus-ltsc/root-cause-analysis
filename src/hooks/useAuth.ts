/**
 * 认证 Context 与 hook。Provider 组件拆在同目录 AuthProvider.tsx 里，让本文件只导出
 * 非组件值，避免触发 React Fast Refresh 的 only-export-components 警告。
 *
 * React Context 工作原理（初学者向）：
 *   Context 是一种"跨层级传递数据"的机制，就像在组件树上打了一个"全局广播管道"。
 *   - Provider（在 AuthProvider.tsx 里）负责"供数"：把 value 挂到管道上；
 *   - 任意层级的组件用 useContext(AuthContext) 就可以"取数"，不需要一层层传 props。
 *   本文件只定义"管道本身"和取数的 hook，真正的数据由 AuthProvider 提供。
 */
import { createContext, useContext } from 'react';
import type { Account } from '../types';

// localStorage 的键名：记录"当前登录账户的 id"。
// 刷新页面后 AuthProvider 会读取这个键来恢复登录态（自动登录）。
export const AUTH_STORAGE_KEY = 'rca-current-account-id';

/**
 * AuthContext 提供的值的类型定义：包括登录状态和四个认证操作。
 * 组件通过 useAuth() 拿到这个结构体。
 */
export interface AuthContextValue {
  /** 当前登录的账户；null 表示未登录 */
  account: Account | null;
  /** 所有已注册的用户名（用于注册时的重名提示） */
  usernames: string[];
  /** 是否仍在初始化（true 时 UI 显示 loading，避免登录态闪烁） */
  initializing: boolean;
  /** 登录：用户名或密码错误时 reject（抛异常） */
  login: (username: string, password: string) => Promise<void>;
  /** 注册新账户并自动登录 */
  register: (username: string, password: string) => Promise<void>;
  /** 重置密码并自动登录 */
  resetPassword: (username: string, newPassword: string) => Promise<void>;
  /** 登出 */
  logout: () => void;
}

/**
 * 认证 Context 对象（"管道"本体）。createContext 传入 undefined 作为默认值，
 * 表示"还没有被 Provider 包裹"——这样 useAuth 里能靠 !ctx 判断出错误用法并抛出提示。
 */
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * 取用认证数据的 hook：任何组件调用它即可拿到登录状态与操作。
 * 必须在 <AuthProvider> 内部使用，否则拿不到 Context 值（ctx 为 undefined），直接抛错提示。
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
