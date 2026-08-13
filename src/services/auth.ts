/**
 * 本地账户认证：使用 Web Crypto SubtleCrypto 做 PBKDF2-SHA256 密码哈希。
 * 纯前端场景下不存在服务端会话，这里仅提供同一浏览器内多账户的数据隔离与
 * 轻量密码门禁，不承担对抗性威胁模型下的安全强度。
 * 核心概念：密码从不以明文保存，只保存"盐(salt) + 用盐派生的哈希值"；
 * 校验时用相同参数重新派生再比对，从而不必存储原始密码。
 */
import { v4 as uuidv4 } from 'uuid';
import type { Account } from '../types';
import { createAccount, getAccountByUsername } from './db';

// PBKDF2 迭代次数：故意拉高到 10 万次，让暴力破解每个密码的耗时显著增加
const PBKDF2_ITERATIONS = 100_000;

// 内部工具：把二进制字节数组转成十六进制字符串（如 "a1b2..."），方便存入 IndexedDB
function toHex(buffer: ArrayBuffer): string {
  // 每个字节（0~255）用 toString(16) 变成 1~2 位十六进制，padStart(2,'0') 补成固定两位
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// 内部工具：十六进制字符串还原成 ArrayBuffer（deriveBits 需要原始字节格式的 salt）
function fromHex(hex: string): ArrayBuffer {
  // /.{2}/g 每两位一组切分，如 "a1b2" -> ["a1","b2"]，再按 16 进制解析回字节
  const bytes = hex.match(/.{2}/g) ?? [];
  return new Uint8Array(bytes.map((b) => parseInt(b, 16))).buffer;
}

// 内部工具：生成 16 字节（128 位）的随机盐。
// 盐必须每个账户各不相同且随机，否则相同密码会得到相同哈希，容易被彩虹表破解
function randomSaltHex(): string {
  const bytes = new Uint8Array(16);
  // getRandomValues 是浏览器提供的密码学安全随机源（比 Math.random 可靠）
  crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}

// 内部工具：用 PBKDF2-SHA256 从"明文密码 + 盐"派生 256 位哈希。
// 同一输入必然得到同一输出，因此可用来校验密码；但过程不可逆，无法从哈希还原密码
async function derivePasswordHash(password: string, saltHex: string): Promise<string> {
  // 第一步 importKey：把字符串密码导入成 PBKDF2 算法能使用的 Key 对象
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  // 第二步 deriveBits：以 salt + 迭代次数为参数派生 256 位密钥材料
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromHex(saltHex), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  return toHex(derivedBits);
}

/**
 * 注册新账户：先查重，再生成随机盐并派生密码哈希，最后把账户写入元数据库。
 * @param username 用户名（唯一，重名会抛错）
 * @param password 明文密码，只用于这一次派生，之后不会被保存
 * @returns 新创建的 Account（含 salt 与 passwordHash）
 * @throws 用户名已存在时抛出 Error
 */
export async function registerAccount(username: string, password: string): Promise<Account> {
  const existing = await getAccountByUsername(username);
  if (existing) {
    throw new Error('用户名已存在');
  }
  const salt = randomSaltHex();
  const passwordHash = await derivePasswordHash(password, salt);
  // 账户记录中只存"盐 + 哈希"，绝不存明文密码
  const account: Account = { id: uuidv4(), username, passwordHash, salt, createdAt: new Date().toISOString() };
  await createAccount(account);
  return account;
}

/**
 * 登录校验：按用户名取回账户，用其盐重新派生输入密码的哈希并与保存值比对。
 * 比对结果一致才说明密码正确——整个过程不需要知道原密码明文。
 * @param username 待校验的用户名
 * @param password 用户输入的明文密码
 * @returns 密码正确返回该 Account，否则返回 undefined（账户不存在也返回 undefined，避免泄露用户名是否存在）
 */
export async function verifyAccountPassword(username: string, password: string): Promise<Account | undefined> {
  const account = await getAccountByUsername(username);
  if (!account) return undefined;
  const hash = await derivePasswordHash(password, account.salt);
  // 恒等比较字符串哈希：不同输入派生结果不同的概率极高，可当作可靠判据
  return hash === account.passwordHash ? account : undefined;
}

/**
 * 忘记密码场景下的密码重置：只按用户名核对账户是否存在，不校验旧密码
 * （本地纯前端架构下没有可信的身份验证手段），生成新 salt+hash 覆盖写回同一账户记录。
 * 业务数据独立存放在 rca-app-{accountId} 中，重置密码不影响任何历史记录。
 * @param username    目标账户的用户名
 * @param newPassword 新密码明文
 * @returns 更新盐与哈希后的 Account
 * @throws 用户名不存在时抛出 Error
 */
export async function resetAccountPassword(username: string, newPassword: string): Promise<Account> {
  const account = await getAccountByUsername(username);
  if (!account) {
    throw new Error('用户名不存在');
  }
  // 重置时也换一个新盐：即使旧哈希被泄露，新哈希也无法与之对应
  const salt = randomSaltHex();
  const passwordHash = await derivePasswordHash(newPassword, salt);
  // 展开原对象 + 覆盖 salt/passwordHash，属于典型的"不可变更新"：保留 id、username、createdAt 不变
  const updated: Account = { ...account, salt, passwordHash };
  await createAccount(updated);
  return updated;
}
