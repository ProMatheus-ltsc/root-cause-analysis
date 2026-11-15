/**
 * 认证收口回归测试
 *
 * 验证切换到 shared-core 统一认证后：
 * 1. 老账户（hex 盐/哈希分列的存量数据）仍能登录——迁移最怕把老用户锁在门外
 * 2. 新注册账户能正常登录
 * 3. 错误密码被拒绝
 */
import { describe, expect, it } from 'vitest';
import { createLocalAuthDriver } from '@shared/core/auth';
import type { LocalAccount } from '@shared/core/auth';

/** 内存版账户存储，模拟项目的 IndexedDB accounts 表 */
function createMemoryStore() {
  const accounts: LocalAccount[] = [];
  return {
    accounts,
    store: {
      list: async () => accounts.map((a) => ({ ...a })),
      findByUsername: async (username: string) => {
        const found = accounts.find((a) => a.username === username);
        return found ? { ...found } : undefined;
      },
      put: async (account: LocalAccount) => {
        const index = accounts.findIndex((a) => a.id === account.id);
        if (index >= 0) accounts[index] = { ...account };
        else accounts.push({ ...account });
      },
    },
  };
}

/** 造一个历史格式的存量账户：盐与哈希分列的 hex */
async function legacyAccount(username: string, password: string): Promise<LocalAccount> {
  const encoder = new TextEncoder();
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = Array.from(saltBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: 100_000 },
    key,
    256,
  );
  const passwordHash = Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return { id: `usr_${username}`, username, passwordHash, salt, createdAt: new Date().toISOString() };
}

describe('本地统一认证（shared-core）', () => {
  it('存量 hex 格式账户仍可登录', async () => {
    const memory = createMemoryStore();
    memory.accounts.push(await legacyAccount('olduser', 'oldpass'));
    const driver = createLocalAuthDriver({
      store: memory.store,
      hashFormat: 'hex',
      sessionMedium: 'localStorage',
      storageKey: 'test-session',
    });

    const user = await driver.login({ username: 'olduser', password: 'oldpass' });
    expect(user.username).toBe('olduser');
    expect(user.id).toBe('usr_olduser');
  });

  it('存量账户用错密码被拒绝', async () => {
    const memory = createMemoryStore();
    memory.accounts.push(await legacyAccount('olduser', 'oldpass'));
    const driver = createLocalAuthDriver({ store: memory.store, hashFormat: 'hex' });

    await expect(driver.login({ username: 'olduser', password: 'wrong' })).rejects.toThrow();
  });

  it('新注册账户可登录，且账户落在项目存储里', async () => {
    const memory = createMemoryStore();
    const driver = createLocalAuthDriver({ store: memory.store, hashFormat: 'hex' });

    const created = await driver.register({ username: 'newuser', password: 'newpass' });
    // 本地注册一步到位：status 为 created，用户信息在 user 上
    expect(created.status).toBe('created');
    expect(created.user?.username).toBe('newuser');
    expect(memory.accounts).toHaveLength(1);
    // 注册后应能直接登录
    const user = await driver.login({ username: 'newuser', password: 'newpass' });
    expect(user.id).toBe(created.user?.id);
  });

  it('重名注册被拒绝', async () => {
    const memory = createMemoryStore();
    const driver = createLocalAuthDriver({ store: memory.store, hashFormat: 'hex' });
    await driver.register({ username: 'dup', password: 'pw123456' });
    await expect(driver.register({ username: 'dup', password: 'pw123456' })).rejects.toThrow();
  });

  it('重置密码后可用新密码登录', async () => {
    const memory = createMemoryStore();
    const driver = createLocalAuthDriver({ store: memory.store, hashFormat: 'hex' });
    await driver.register({ username: 'resetme', password: 'oldpass' });
    await driver.resetPassword?.({ username: 'resetme', newPassword: 'newpass' });
    const user = await driver.login({ username: 'resetme', password: 'newpass' });
    expect(user.username).toBe('resetme');
  });

  it('没有账户时 isFirstTime 为 true', async () => {
    const memory = createMemoryStore();
    const driver = createLocalAuthDriver({ store: memory.store, hashFormat: 'hex' });
    await expect(driver.isFirstTime()).resolves.toBe(true);
    await driver.register({ username: 'first', password: 'pw123456' });
    await expect(driver.isFirstTime()).resolves.toBe(false);
  });
});
