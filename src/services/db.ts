/**
 * IndexedDB 数据层：元库 rca-app 存放账户列表；每个账户拥有独立的业务库
 * rca-app-{accountId}（records + settings），实现多账户数据隔离。
 * setCurrentAccountId 切换账户上下文时会重置业务库连接缓存。
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Account, FormRecord, Problem } from '../types';

interface MetaDBSchema extends DBSchema {
  accounts: {
    key: string;
    value: Account;
  };
}

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
}

const META_DB_NAME = 'rca-app';

let metaDBPromise: Promise<IDBPDatabase<MetaDBSchema>> | undefined;

function getMetaDB(): Promise<IDBPDatabase<MetaDBSchema>> {
  if (!metaDBPromise) {
    metaDBPromise = openDB<MetaDBSchema>(META_DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore('accounts', { keyPath: 'id' });
      },
    });
  }
  return metaDBPromise;
}

let currentAccountId: string | undefined;
let businessDBPromise: Promise<IDBPDatabase<BusinessDBSchema>> | undefined;

export function setCurrentAccountId(accountId: string | undefined): void {
  currentAccountId = accountId;
  businessDBPromise = undefined;
}

export function getCurrentAccountId(): string | undefined {
  return currentAccountId;
}

function getBusinessDB(): Promise<IDBPDatabase<BusinessDBSchema>> {
  if (!currentAccountId) {
    throw new Error('尚未选择当前账户，无法访问业务数据库');
  }
  if (!businessDBPromise) {
    const dbName = `rca-app-${currentAccountId}`;
    businessDBPromise = openDB<BusinessDBSchema>(dbName, 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const recordStore = db.createObjectStore('records', { keyPath: 'id' });
          recordStore.createIndex('templateId', 'templateId');
          recordStore.createIndex('createdAt', 'createdAt');
          recordStore.createIndex('updatedAt', 'updatedAt');
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        if (oldVersion < 2) {
          const problemStore = db.createObjectStore('problems', { keyPath: 'id' });
          problemStore.createIndex('createdAt', 'createdAt');
          problemStore.createIndex('updatedAt', 'updatedAt');
          // 给已存在的 records store 补建 problemId 索引（问题为导向的关联查询）
          const recordStore = (db as unknown as { transaction: (stores: string[], mode: string) => { objectStore: (name: string) => { createIndex: (name: string, keyPath: string) => void } } }).transaction(['records'], 'readwrite').objectStore('records');
          recordStore.createIndex('problemId', 'problemId');
        }
      },
    });
  }
  return businessDBPromise;
}

export async function listAccounts(): Promise<Account[]> {
  const db = await getMetaDB();
  return db.getAll('accounts');
}

export async function getAccountByUsername(username: string): Promise<Account | undefined> {
  const accounts = await listAccounts();
  return accounts.find((a) => a.username === username);
}

export async function createAccount(account: Account): Promise<void> {
  const db = await getMetaDB();
  await db.put('accounts', account);
}

export async function getAllRecords(): Promise<FormRecord[]> {
  const db = await getBusinessDB();
  return db.getAll('records');
}

export async function getRecord(id: string): Promise<FormRecord | undefined> {
  const db = await getBusinessDB();
  return db.get('records', id);
}

export async function putRecord(record: FormRecord): Promise<void> {
  const db = await getBusinessDB();
  await db.put('records', record);
}

export async function deleteRecord(id: string): Promise<void> {
  const db = await getBusinessDB();
  await db.delete('records', id);
}

export async function getRecordsByProblem(problemId: string): Promise<FormRecord[]> {
  const db = await getBusinessDB();
  return db.getAllFromIndex('records', 'problemId', problemId);
}

export async function getAllProblems(): Promise<Problem[]> {
  const db = await getBusinessDB();
  return db.getAll('problems');
}

export async function getProblem(id: string): Promise<Problem | undefined> {
  const db = await getBusinessDB();
  return db.get('problems', id);
}

export async function putProblem(problem: Problem): Promise<void> {
  const db = await getBusinessDB();
  await db.put('problems', problem);
}

export async function deleteProblem(id: string): Promise<void> {
  const db = await getBusinessDB();
  await db.delete('problems', id);
}

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const db = await getBusinessDB();
  const row = await db.get('settings', key);
  return row ? (row.value as T) : defaultValue;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const db = await getBusinessDB();
  await db.put('settings', { key, value });
}

export interface ExportedData {
  records: FormRecord[];
  problems: Problem[];
  settings: Record<string, unknown>;
}

export async function exportAllData(): Promise<ExportedData> {
  const db = await getBusinessDB();
  const records = await db.getAll('records');
  const problems = await db.getAll('problems');
  const settingsRows = await db.getAll('settings');
  const settings = Object.fromEntries(settingsRows.map((row) => [row.key, row.value]));
  return { records, problems, settings };
}

export async function importAllData(data: ExportedData): Promise<void> {
  const db = await getBusinessDB();
  const tx = db.transaction(['records', 'problems', 'settings'], 'readwrite');
  await Promise.all(data.records.map((record) => tx.objectStore('records').put(record)));
  await Promise.all((data.problems ?? []).map((problem) => tx.objectStore('problems').put(problem)));
  await Promise.all(Object.entries(data.settings ?? {}).map(([key, value]) => tx.objectStore('settings').put({ key, value })));
  await tx.done;
}

export async function clearAllData(): Promise<void> {
  const db = await getBusinessDB();
  const tx = db.transaction(['records', 'problems', 'settings'], 'readwrite');
  await tx.objectStore('records').clear();
  await tx.objectStore('problems').clear();
  await tx.objectStore('settings').clear();
  await tx.done;
}
