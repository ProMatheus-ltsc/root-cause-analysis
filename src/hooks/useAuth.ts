/**
 * 认证 Context 与 hook —— 转发到 shared-core 的统一认证。
 *
 * 本项目不再自建认证实现：
 * - 状态机、登录/注册/重置语义、错误处理：shared-core 的 `AuthProvider` / `useAuth`
 * - 具体认证后端：本项目的 `services/authDriver.ts`（本地 IndexedDB）
 *
 * 这里只做两件事：
 * 1. 转发 `useAuth`，保持既有 import 路径可用；
 * 2. 保留 `AUTH_STORAGE_KEY` 常量（`services/authDriver.ts` 与
 *    `pages/SeedPage.tsx` 仍直接用它写入登录态）。
 */
import { useAuth as useSharedAuth } from '@shared/core/auth';

export { AUTH_STORAGE_KEY } from '../services/authDriver';

/** shared-core 的认证上下文类型 */
export type AuthContextValue = ReturnType<typeof useSharedAuth>;

/**
 * 取用认证数据的 hook：必须在 <AuthProvider> 内部使用。
 */
export function useAuth(): AuthContextValue {
  return useSharedAuth();
}
