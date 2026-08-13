/**
 * Toast 通知 Provider：showToast(message, type) 弹出提示，3 秒后自动消失，
 * 同时最多显示 MAX_VISIBLE_TOASTS 条，避免连续操作时在角落堆叠成一串。
 *
 * 扮演的角色：全局"轻提示"系统。挂载在应用根部，任何组件都能调用 useToast() 弹出
 * 一条右下角的浮动通知（成功/错误/普通信息），用于反馈操作结果。
 * 核心概念：toast 不是浏览器弹窗，而是渲染在页面角落的 div 列表，每条 toast
 * 都靠 setTimeout 定时把它自己从列表里移除来实现"自动消失"。
 */
import { useCallback, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { MAX_VISIBLE_TOASTS, ToastContext, type ToastItem, type ToastType } from './useToast';

// 模块级计数器：用来生成全局唯一的 toast id（如 toast-1、toast-2…）。
// 放在组件外面而不是组件内部，是为了让计数器在组件多次渲染/重挂载后依然连续累加，
// 因为 setTimeout 的闭包引用的是旧 id，id 一旦重复就会出现"删错 toast"的 bug。
let toastCounter = 0;

/**
 * ToastProvider 组件：通过 Context 暴露 showToast，并在自己内部渲染所有 toast 的界面。
 * children 渲染在上方，toast 列表渲染在右下角浮层。
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  // 当前屏幕上所有 toast 的列表；每一条在倒计时结束后会被自己移除
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  /**
   * 弹出一条 toast。用 useCallback 包裹是为了让 showToast 引用稳定，
   * 这样用它做依赖的组件不会因为父组件重渲染而跟着重新执行。
   */
  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    // 自增计数器生成唯一 id，供后面的定时器精确删除这条 toast
    const id = `toast-${++toastCounter}`;
    // 追加新 toast，同时用 slice(-(MAX_VISIBLE_TOASTS-1)) 只保留"最后几条"：
    // 当列表满时，最旧的 toast 会被挤出屏幕，保证最多同时显示 MAX_VISIBLE_TOASTS 条
    setToasts((prev) => [...prev.slice(-(MAX_VISIBLE_TOASTS - 1)), { id, message, type }]);
    // 错误提示显示久一点（5 秒），其余 3 秒后消失
    const duration = type === 'error' ? 5000 : 3000;
    // 定时器到期后，从列表里筛掉这条 id 的 toast，实现"自动消失"
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return (
    // Provider 把 showToast 下发给所有子组件；children 渲染在上层，
    // toast 浮层渲染在下层，互不影响布局
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* toast 浮层：固定定位在右下角，no-print 表示打印页面时隐藏，flex 纵向排列多条提示 */}
      <div className="no-print fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {/* 遍历 toast 列表，按 type 决定背景色：成功绿 / 错误红 / 普通深色 */}
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx('animate-slide-up rounded-xl px-5 py-3 text-sm font-medium text-white shadow-lg', {
              'bg-success': t.type === 'success',
              'bg-danger': t.type === 'error',
              'bg-text-primary': t.type === 'info',
            })}
            role="alert"
            aria-live="polite"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
