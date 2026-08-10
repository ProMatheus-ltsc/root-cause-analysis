/**
 * 本地账户认证：使用 Web Crypto SubtleCrypto 做 PBKDF2-SHA256 密码哈希。
 * 纯前端场景下不存在服务端会话，这里仅提供同一浏览器内多账户的数据隔离与
 * 轻量密码门禁，不承担对抗性威胁模型下的安全强度。
 */
import { v4 as uuidv4 } from 'uuid';
import type { Account } from '../types';
import { createAccount, getAccountByUsername } from './db';

const PBKDF2_ITERATIONS = 100_000;

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): ArrayBuffer {
  const bytes = hex.match(/.{2}/g) ?? [];
  return new Uint8Array(bytes.map((b) => parseInt(b, 16))).buffer;
}

function randomSaltHex(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}

async function derivePasswordHash(password: string, saltHex: string): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromHex(saltHex), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  return toHex(derivedBits);
}

export async function registerAccount(username: string, password: string): Promise<Account> {
  const existing = await getAccountByUsername(username);
  if (existing) {
    throw new Error('用户名已存在');
  }
  const salt = randomSaltHex();
  const passwordHash = await derivePasswordHash(password, salt);
  const account: Account = { id: uuidv4(), username, passwordHash, salt, createdAt: new Date().toISOString() };
  await createAccount(account);
  return account;
}

export async function verifyAccountPassword(username: string, password: string): Promise<Account | undefined> {
  const account = await getAccountByUsername(username);
  if (!account) return undefined;
  const hash = await derivePasswordHash(password, account.salt);
  return hash === account.passwordHash ? account : undefined;
}

/**
 * 忘记密码场景下的密码重置：只按用户名核对账户是否存在，不校验旧密码
 * （本地纯前端架构下没有可信的身份验证手段），生成新 salt+hash 覆盖写回同一账户记录。
 * 业务数据独立存放在 rca-app-{accountId} 中，重置密码不影响任何历史记录。
 */
export async function resetAccountPassword(username: string, newPassword: string): Promise<Account> {
  const account = await getAccountByUsername(username);
  if (!account) {
    throw new Error('用户名不存在');
  }
  const salt = randomSaltHex();
  const passwordHash = await derivePasswordHash(newPassword, salt);
  const updated: Account = { ...account, salt, passwordHash };
  await createAccount(updated);
  return updated;
}
