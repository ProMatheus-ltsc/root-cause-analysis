/**
 * 本项目认证装配：把 shared-core 的统一认证接到本项目的 IndexedDB 上。
 *
 * - 认证算法、状态机、错误语义：全部走 shared-core（`@shared/core/auth`）
 * - 账户存储：仍用本项目的 `services/db.ts`（业务库是 rca-app-{accountId}，
 *   含 shared-core 没有的 problems 表与 v3 结构，不适合直接换用包内 db 层）
 *
 * 历史兼容：
 * - 哈希格式 hex（盐与哈希分列），shared-core 的 localDriver 原生支持
 * - 会话键仍是 `rca-current-account-id`，老用户不会被登出
 */
import { createLocalAuthDriver, type LocalAccount } from '@shared/core/auth';
import { listAccounts, getAccountByUsername, createAccount } from '../services/db';
import type { Account } from '../types';

/**
 * localStorage 键名：记录当前登录账户 id。
 * 沿用历史键名，避免切换到 shared-core 后老用户被登出。
 */
export const AUTH_STORAGE_KEY = 'rca-current-account-id';

/** 本项目 Account 与 shared-core LocalAccount 的字段一一对应（形状相同） */
function toLocalAccount(account: Account): LocalAccount {
  return {
    id: account.id,
    username: account.username,
    passwordHash: account.passwordHash,
    salt: account.salt,
    createdAt: account.createdAt,
  };
}

/** shared-core 本地认证驱动 */
export const localAuthDriver = createLocalAuthDriver({
  store: {
    list: async () => (await listAccounts()).map(toLocalAccount),
    findByUsername: async (username) => {
      const found = await getAccountByUsername(username);
      return found ? toLocalAccount(found) : undefined;
    },
    put: async (account) => {
      await createAccount(account as Account);
    },
  },
  hashFormat: 'hex',
  sessionMedium: 'localStorage',
  storageKey: AUTH_STORAGE_KEY,
});
