/**
 * Toast 通知的 Context 与 hook。Provider 组件拆在同目录 ToastProvider.tsx 里，
 * 让本文件只导出非组件值，避免触发 React Fast Refresh 的 only-export-components 警告。
 *
 * 与 useAuth.ts 的分工方式相同：本文件只定义"Toast 管道"（Context）和取用的 hook，
 * 真正维护 toast 列表、渲染浮层的逻辑在 ToastProvider.tsx 里。
 */
import { createContext, useContext } from 'react';

// 屏幕上最多同时显示的 toast 条数：超出后最旧的会被挤掉，防止连点按钮时堆成一条长串
export const MAX_VISIBLE_TOASTS = 3;

/** toast 的类型：普通信息 / 成功 / 错误，决定底色与展示时长 */
export type ToastType = 'info' | 'success' | 'error';

/** 一条 toast 的数据结构 */
export interface ToastItem {
  /** 唯一 id，供定时器到期后精确删除这条 */
  id: string;
  /** 展示的提示文案 */
  message: string;
  /** 类型，决定颜色与时长 */
  type: ToastType;
}

/** Toast Context 提供的值：目前只有弹提示这一件事 */
export interface ToastContextValue {
  /** 弹出一条 toast；type 缺省为 'info' */
  showToast: (message: string, type?: ToastType) => void;
}

/**
 * Toast Context 对象（"管道"本体）。默认值为 undefined，
 * 因此 useToast 里可以用 !ctx 判断出"组件没被 Provider 包裹"的错误用法。
 */
export const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/**
 * 取用 Toast 能力的 hook：任何组件调用它即可弹出提示。
 * 必须在 <ToastProvider> 内部使用，否则抛出错误提示。
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
