/**
 * IndexedDB 数据层：元库 rca-app 存放账户列表；每个账户拥有独立的业务库
 * rca-app-{accountId}（records + settings），实现多账户数据隔离。
 * setCurrentAccountId 切换账户上下文时会重置业务库连接缓存。
 * 核心概念：IndexedDB 是浏览器内置的"对象数据库"，与 localStorage 不同，
 * 它支持索引、事务与大数据量存储；本文件是所有数据读写的唯一出口。
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Account, FormRecord, Problem } from '../types';

// 元库的表结构定义：只有一个 accounts 表，主键是账户 id
interface MetaDBSchema extends DBSchema {
  accounts: {
    key: string;
    value: Account;
  };
}

// 业务库的表结构定义：四个表（problems/records/settings/snapshots），
// indexes 字段声明的是各表上建立的索引名及对应索引字段（用于按字段快速查询）
interface BusinessDBSchema extends DBSchema {
  problems: {
    key: string;
    value: Problem;
    indexes: { createdAt: string; updatedAt: string };
  };
  records: {
    key: string;
    value: FormRecord;
    indexes: { templateId: string; createdAt: string; updatedAt: string; problemId: string };
  };
  settings: {
    key: string;
    value: { key: string; value: unknown };
  };
  snapshots: {
    key: string;
    value: Snapshot;
    indexes: { recordId: string; createdAt: string };
  };
}

/** 表单快照：某条记录在某个时间点的完整字段数据，用于"回到某一步"类的撤销/回放功能。 */
export interface Snapshot {
  id: string;
  recordId: string;
  data: Record<string, unknown>;
  label: string;
  createdAt: string;
}

const META_DB_NAME = 'rca-app';

// 缓存元库连接：openDB 是异步的，把 Promise 缓存下来，后续调用复用同一连接，
// 避免每次操作都重新打开数据库（打开数据库有版本协商开销）
let metaDBPromise: Promise<IDBPDatabase<MetaDBSchema>> | undefined;

// 内部函数：懒加载打开元库。upgrade 回调在"首次创建或版本升级"时执行，用于建表
function getMetaDB(): Promise<IDBPDatabase<MetaDBSchema>> {
  if (!metaDBPromise) {
    // openDB 的第二个参数是目标版本号（这里是 1）
    metaDBPromise = openDB<MetaDBSchema>(META_DB_NAME, 1, {
      upgrade(db) {
        // createObjectStore 建表，keyPath: 'id' 表示用记录的 id 字段作为主键
        db.createObjectStore('accounts', { keyPath: 'id' });
      },
    });
  }
  return metaDBPromise;
}

let currentAccountId: string | undefined;
let businessDBPromise: Promise<IDBPDatabase<BusinessDBSchema>> | undefined;

/**
 * 切换当前账户上下文：记录新账户 id，并清空业务库连接缓存。
 * 因为业务库名是 rca-app-{accountId}，换账户必须重新打开对应的库，
 * 否则会一直读写旧账户的数据，造成跨账户串数据。
 * @param accountId 目标账户 id；传 undefined 表示退出登录
 */
export function setCurrentAccountId(accountId: string | undefined): void {
  currentAccountId = accountId;
  businessDBPromise = undefined;
}

/** 读取当前账户 id（登录态判断 / 组装业务库名用）。 */
export function getCurrentAccountId(): string | undefined {
  return currentAccountId;
}

// 内部函数：懒加载打开当前账户的业务库。
// version 3 表示当前数据库结构版本，upgrade 里的旧版本分支是"版本迁移"逻辑
function getBusinessDB(): Promise<IDBPDatabase<BusinessDBSchema>> {
  if (!currentAccountId) {
    throw new Error('尚未选择当前账户，无法访问业务数据库');
  }
  if (!businessDBPromise) {
    const dbName = `rca-app-${currentAccountId}`;
    businessDBPromise = openDB<BusinessDBSchema>(dbName, 3, {
      // upgrade 会在数据库刚创建或版本从旧升到新时执行；oldVersion 是升级前的版本号。
      // 用 if (oldVersion < N) 分段执行：老用户升级时只需补跑自己缺的段落，已建的结构不会再建
      upgrade(db, oldVersion, _newVersion, transaction) {
        // v1：建 records / settings 两张表，并给 records 建三个普通索引
        if (oldVersion < 1) {
          const recordStore = db.createObjectStore('records', { keyPath: 'id' });
          // createIndex('索引名', '被索引的字段路径')：之后就能按该字段快速查询
          recordStore.createIndex('templateId', 'templateId');
          recordStore.createIndex('createdAt', 'createdAt');
          recordStore.createIndex('updatedAt', 'updatedAt');
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        // v2：新增 problems 表，并给已有的 records 表补一个 problemId 索引
        if (oldVersion < 2) {
          const problemStore = db.createObjectStore('problems', { keyPath: 'id' });
          problemStore.createIndex('createdAt', 'createdAt');
          problemStore.createIndex('updatedAt', 'updatedAt');
          // 注意：给"已存在的表"加索引必须通过 transaction 拿到该表再建，不能直接 db.createObjectStore
          transaction.objectStore('records').createIndex('problemId', 'problemId');
        }
        // v3：新增 snapshots 表（快照），含 recordId / createdAt 两个索引
        if (oldVersion < 3) {
          const snapshotStore = db.createObjectStore('snapshots', { keyPath: 'id' });
          snapshotStore.createIndex('recordId', 'recordId');
          snapshotStore.createIndex('createdAt', 'createdAt');
        }
      },
    });
  }
  return businessDBPromise;
}

/**
 * 列出元库中的全部账户。
 * @returns Account 数组（无序，调用方按需排序）
 */
export async function listAccounts(): Promise<Account[]> {
  const db = await getMetaDB();
  return db.getAll('accounts');
}

/**
 * 按用户名精确查找账户。
 * @param username 用户名
 * @returns 命中的 Account；不存在返回 undefined
 */
export async function getAccountByUsername(username: string): Promise<Account | undefined> {
  const accounts = await listAccounts();
  // 账户量级很小，直接线性查找即可；注意区分"数组里没有"与"找到 id 为 undefined 的项"
  return accounts.find((a) => a.username === username);
}

/**
 * 写入（或覆盖）一个账户。put 语义是"有则覆盖、无则新增"。
 * @param account 完整账户对象（含 id 主键）
 */
export async function createAccount(account: Account): Promise<void> {
  const db = await getMetaDB();
  await db.put('accounts', account);
}

/** 读取当前账户业务库中的全部分析记录。 */
export async function getAllRecords(): Promise<FormRecord[]> {
  const db = await getBusinessDB();
  return db.getAll('records');
}

/** 按主键读取单条记录；不存在返回 undefined。 */
export async function getRecord(id: string): Promise<FormRecord | undefined> {
  const db = await getBusinessDB();
  return db.get('records', id);
}

/** 保存（新建或覆盖）一条分析记录。 */
export async function putRecord(record: FormRecord): Promise<void> {
  const db = await getBusinessDB();
  await db.put('records', record);
}

/** 按主键删除一条分析记录。 */
export async function deleteRecord(id: string): Promise<void> {
  const db = await getBusinessDB();
  await db.delete('records', id);
}

/** 按 problemId 索引查出属于某个问题的全部记录（问题实体与记录是一对多）。 */
export async function getRecordsByProblem(problemId: string): Promise<FormRecord[]> {
  const db = await getBusinessDB();
  return db.getAllFromIndex('records', 'problemId', problemId);
}

/** 读取当前账户的全部问题实体。 */
export async function getAllProblems(): Promise<Problem[]> {
  const db = await getBusinessDB();
  return db.getAll('problems');
}

/** 按主键读取单个问题；不存在返回 undefined。 */
export async function getProblem(id: string): Promise<Problem | undefined> {
  const db = await getBusinessDB();
  return db.get('problems', id);
}

/** 保存（新建或覆盖）一个问题实体。 */
export async function putProblem(problem: Problem): Promise<void> {
  const db = await getBusinessDB();
  await db.put('problems', problem);
}

/** 按主键删除一个问题实体。 */
export async function deleteProblem(id: string): Promise<void> {
  const db = await getBusinessDB();
  await db.delete('problems', id);
}

/**
 * 读取一项设置。settings 表的结构是 { key, value } 的通用键值对。
 * @param key          设置键名
 * @param defaultValue 键不存在时返回的默认值
 * @returns 设置值（类型由调用方指定）或默认值
 */
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const db = await getBusinessDB();
  const row = await db.get('settings', key);
  return row ? (row.value as T) : defaultValue;
}

/** 写入一项设置（put 语义：同 key 覆盖）。 */
export async function setSetting(key: string, value: unknown): Promise<void> {
  const db = await getBusinessDB();
  await db.put('settings', { key, value });
}

/** 备份导出结果的形状：全部记录 + 全部问题 + 设置的扁平对象。 */
export interface ExportedData {
  records: FormRecord[];
  problems: Problem[];
  settings: Record<string, unknown>;
}

/** 导出当前账户的全部业务数据，用于"备份 / 迁移到另一台设备"。 */
export async function exportAllData(): Promise<ExportedData> {
  const db = await getBusinessDB();
  const records = await db.getAll('records');
  const problems = await db.getAll('problems');
  const settingsRows = await db.getAll('settings');
  // Object.fromEntries 把 [{key,value},...] 转成 { key: value, ... } 的扁平对象，更便于 JSON 序列化
  const settings = Object.fromEntries(settingsRows.map((row) => [row.key, row.value]));
  return { records, problems, settings };
}

/**
 * 批量导入备份数据（写回三个表）。
 * 这里显式开启了一个跨三张表的 readwrite 事务：
 * - 事务保证"要么全部写入，要么全部失败"，中途出错时已有写入会被回滚；
 * - Promise.all 并行提交各表的 put，最后 await tx.done 等待整个事务完成。
 * @param data 之前 exportAllData 导出的数据
 */
export async function importAllData(data: ExportedData): Promise<void> {
  const db = await getBusinessDB();
  const tx = db.transaction(['records', 'problems', 'settings'], 'readwrite');
  await Promise.all(data.records.map((record) => tx.objectStore('records').put(record)));
  await Promise.all((data.problems ?? []).map((problem) => tx.objectStore('problems').put(problem)));
  await Promise.all(Object.entries(data.settings ?? {}).map(([key, value]) => tx.objectStore('settings').put({ key, value })));
  await tx.done;
}

/** 清空当前账户业务库的三张业务表（records / problems / settings），用于"重置数据"。 */
export async function clearAllData(): Promise<void> {
  const db = await getBusinessDB();
  // 同样用事务包裹：三个表要么都清空、要么都不动，避免清到一半断电留下半份数据
  const tx = db.transaction(['records', 'problems', 'settings'], 'readwrite');
  await tx.objectStore('records').clear();
  await tx.objectStore('problems').clear();
  await tx.objectStore('settings').clear();
  await tx.done;
}

/** 按 recordId 索引取出某条记录的全部快照（按创建时间升序，历史顺序自然排列）。 */
export async function getSnapshotsByRecord(recordId: string): Promise<Snapshot[]> {
  const db = await getBusinessDB();
  return db.getAllFromIndex('snapshots', 'recordId', recordId);
}

/** 保存一个快照。 */
export async function putSnapshot(snapshot: Snapshot): Promise<void> {
  const db = await getBusinessDB();
  await db.put('snapshots', snapshot);
}

/** 按主键删除单个快照。 */
export async function deleteSnapshot(id: string): Promise<void> {
  const db = await getBusinessDB();
  await db.delete('snapshots', id);
}

/** 删除某条记录的全部快照（记录被删除时连带清理，避免留下孤儿快照）。 */
export async function deleteSnapshotsByRecord(recordId: string): Promise<void> {
  const db = await getBusinessDB();
  // 先查全量：getAllFromIndex 是异步读取，读到的列表再逐个删除
  const all = await db.getAllFromIndex('snapshots', 'recordId', recordId);
  // 删除操作放进单个事务，确保批量删除是原子的
  const tx = db.transaction('snapshots', 'readwrite');
  await Promise.all(all.map((s) => tx.store.delete(s.id)));
  await tx.done;
}
