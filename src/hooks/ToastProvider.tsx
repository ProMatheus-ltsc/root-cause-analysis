/**
 * Toast 通知 Provider：showToast(message, type) 弹出提示，3 秒后自动消失，
 * 同时最多显示 MAX_VISIBLE_TOASTS 条，避免连续操作时在角落堆叠成一串。
 */
import { useCallback, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { MAX_VISIBLE_TOASTS, ToastContext, type ToastItem, type ToastType } from './useToast';

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${++toastCounter}`;
    setToasts((prev) => [...prev.slice(-(MAX_VISIBLE_TOASTS - 1)), { id, message, type }]);
    const duration = type === 'error' ? 5000 : 3000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="no-print fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx('rounded-lg px-4 py-2 text-sm text-white shadow-lg', {
              'bg-emerald-600': t.type === 'success',
              'bg-rose-600': t.type === 'error',
              'bg-slate-800': t.type === 'info',
            })}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
