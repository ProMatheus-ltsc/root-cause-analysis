/**
 * 本地账户认证 —— 转发到 shared-core 的统一认证实现。
 *
 * 历史上的 PBKDF2 哈希实现（盐生成、派生、常量时间比较）已全部下沉到
 * `@shared/core/auth`，本文件只保留"接本项目 IndexedDB"的那一层。
 *
 * 哈希格式仍为 hex（盐与哈希分列），与既有账户数据兼容，
 * 老用户切换后无需重置密码。
 */
import { createLocalAuthDriver, type LocalAccount } from '@shared/core/auth';
import { listAccounts, getAccountByUsername, createAccount } from './db';
import type { Account } from '../types';

/** 本项目 Account 与 shared-core LocalAccount 形状一致 */
function toLocalAccount(account: Account): LocalAccount {
  return {
    id: account.id,
    username: account.username,
    passwordHash: account.passwordHash,
    salt: account.salt,
    createdAt: account.createdAt,
  };
}

function fromLocalAccount(account: LocalAccount): Account {
  return {
    id: account.id,
    username: account.username,
    passwordHash: account.passwordHash,
    salt: account.salt ?? '',
    createdAt: account.createdAt,
  };
}

/** 底层驱动（供 authDriver.ts 装配 Provider 用） */
const driver = createLocalAuthDriver({
  store: {
    list: async () => (await listAccounts()).map(toLocalAccount),
    findByUsername: async (username) => {
      const found = await getAccountByUsername(username);
      return found ? toLocalAccount(found) : undefined;
    },
    put: async (account) => {
      await createAccount(fromLocalAccount(account));
    },
  },
  hashFormat: 'hex',
});

/**
 * 注册新账户：先查重，再生成随机盐并派生密码哈希，最后写入元数据库。
 * @throws 用户名已存在时抛出 Error
 */
export async function registerAccount(username: string, password: string): Promise<Account> {
  if (!driver.register) throw new Error('当前系统未开放自助注册');
  const result = await driver.register({ username, password });
  // 本地注册一步到位：status 为 created，用户信息在 user 上
  if (result.status !== 'created' || !result.user) {
    throw new Error('注册未完成');
  }
  return {
    id: result.user.id,
    username: result.user.username,
    passwordHash: '',
    salt: '',
    createdAt: new Date().toISOString(),
  };
}

/**
 * 校验用户名 + 密码。
 * @returns 校验通过返回账户，否则 undefined
 */
export async function verifyAccountPassword(
  username: string,
  password: string,
): Promise<Account | undefined> {
  const account = await driver.login({ username, password }).catch(() => undefined);
  return account ? fromLocalAccount(account as LocalAccount) : undefined;
}

/**
 * 重置密码：换新盐重新派生并写回。用户名不存在时抛错。
 */
export async function resetAccountPassword(username: string, newPassword: string): Promise<Account> {
  await driver.resetPassword?.({ username, newPassword });
  const updated = await getAccountByUsername(username);
  if (!updated) throw new Error('用户名不存在');
  return updated;
}
