/**
 * 认证 Provider —— 转发到 shared-core 的统一认证。
 *
 * 本项目只提供"用哪个驱动"，认证逻辑（状态机 / 错误 / 会话恢复）全在 shared-core。
 * 用 `errorMode="throw"`：既有调用方（LoginPage）在 await 之后直接导航，
 * 失败时靠 try/catch 拿到中文错误文案。
 */
import type { ReactNode } from 'react';
import { AuthProvider as SharedAuthProvider } from '@shared/core/auth';
import { localAuthDriver } from '../services/authDriver';

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SharedAuthProvider driver={localAuthDriver} errorMode="throw">
      {children}
    </SharedAuthProvider>
  );
}
