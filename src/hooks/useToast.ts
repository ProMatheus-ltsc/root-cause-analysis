/**
 * Toast 通知的 Context 与 hook。Provider 组件拆在同目录 ToastProvider.tsx 里，
 * 让本文件只导出非组件值，避免触发 React Fast Refresh 的 only-export-components 警告。
 */
import { createContext, useContext } from 'react';

export const MAX_VISIBLE_TOASTS = 3;

export type ToastType = 'info' | 'success' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
