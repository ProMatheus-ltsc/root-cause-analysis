/**
 * 验证 db.ts 的 IndexedDB 升级逻辑（v1 → v2）运行时正确性：
 * - v1 旧库升级 v2 后 problems store 与 records.problemId 索引存在
 * - putProblem / getRecordsByProblem 索引查询可用
 * 用 fake-indexeddb 模拟浏览器 IndexedDB，避免只在浏览器环境暴露的运行时问题。
 */
import { describe, expect, it, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import type { Account, FormRecord, Problem } from '../types';
import * as db from '../services/db';

function makeAccount(id: string): Account {
  return { id, username: `u${id}`, passwordHash: 'h', salt: 's', createdAt: '2026-08-01T00:00:00.000Z' };
}

function makeProblem(id: string): Problem {
  return { id, title: `问题${id}`, problemStatement: '陈述', data: {}, createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z' };
}

function makeRecord(id: string, problemId?: string): FormRecord {
  return { id, templateId: 'fiveWhy', problemId, title: 'r', data: {}, status: 'draft', createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z' };
}

describe('db v1→v2 升级与问题关联', () => {
  beforeEach(async () => {
    db.setCurrentAccountId(undefined);
    // 清理 fake-indexeddb 中的残留数据库
    const names = await indexedDB.databases();
    await Promise.all(names.map((d) => d.name && indexedDB.deleteDatabase(d.name)));
  });

  it('v2 库可写读问题，且按 problemId 索引查询记录', async () => {
    await db.createAccount(makeAccount('a1'));
    db.setCurrentAccountId('a1');

    // 写入问题与两条关联记录
    await db.putProblem(makeProblem('p1'));
    await db.putRecord(makeRecord('r1', 'p1'));
    await db.putRecord(makeRecord('r2', 'p1'));
    await db.putRecord(makeRecord('r3')); // 未关联

    const problems = await db.getAllProblems();
    expect(problems).toHaveLength(1);
    expect(problems[0].id).toBe('p1');

    const byProblem = await db.getRecordsByProblem('p1');
    expect(byProblem.map((r) => r.id).sort()).toEqual(['r1', 'r2']);
  });

  it('v1 库（仅 records/settings）升级到 v2 后 problems 可用且索引生效', async () => {
    // 先构造一个只有 v1 结构的旧库
    await db.createAccount(makeAccount('a2'));
    db.setCurrentAccountId('a2');
    // 直接以 v1 版本号打开旧库并写入旧数据
    const oldDB = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(`rca-app-a2`, 1);
      req.onupgradeneeded = () => {
        const store = req.result.createObjectStore('records', { keyPath: 'id' });
        store.createIndex('templateId', 'templateId');
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('updatedAt', 'updatedAt');
        req.result.createObjectStore('settings', { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = oldDB.transaction('records', 'readwrite');
      tx.objectStore('records').put(makeRecord('old1'));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      oldDB.close();
    });

    // 重置连接缓存，触发 v1→v2 升级
    db.setCurrentAccountId(undefined);
    db.setCurrentAccountId('a2');

    // 升级后旧记录仍在
    const records = await db.getAllRecords();
    expect(records.map((r) => r.id)).toEqual(['old1']);

    // 新 problems store 可用
    await db.putProblem(makeProblem('p2'));
    expect((await db.getAllProblems()).map((p) => p.id)).toEqual(['p2']);

    // 给旧记录补 problemId 后可用索引查询
    await db.putRecord({ ...records[0], problemId: 'p2' });
    expect((await db.getRecordsByProblem('p2')).map((r) => r.id)).toEqual(['old1']);
  });
});
