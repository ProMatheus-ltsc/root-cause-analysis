/**
 * Zustand store：管理 FormRecord[] 状态，提供 fetch/add/update/remove/getByProblem 方法。
 * 乐观更新：先修改本地 state，再异步写入 IndexedDB；写入失败时回滚。
 */
import { create } from 'zustand';
import type { FormRecord } from '../types';
import * as db from '../services/db';

export interface RecordState {
  records: FormRecord[];
  loading: boolean;
  /** 首次加载是否已完成 */
  _initialized: boolean;

  /** 从 IndexedDB 拉取全量数据（首次调用 loading=true，后续静默刷新） */
  fetch: () => Promise<void>;
  /** 新增或更新记录（乐观更新） */
  add: (record: FormRecord) => Promise<void>;
  /** 更新记录（等同 add，put 语义） */
  update: (record: FormRecord) => Promise<void>;
  /** 删除记录（乐观更新） */
  remove: (id: string) => Promise<void>;
  /** 获取某问题下的所有记录（派生查询，从内存 state 过滤） */
  getByProblem: (problemId: string) => FormRecord[];
}

export const useRecordStore = create<RecordState>((set, get) => ({
  records: [],
  loading: true,
  _initialized: false,

  fetch: async () => {
    if (!get()._initialized) {
      set({ loading: true });
    }
    try {
      const fresh = await db.getAllRecords();
      set({ records: fresh, loading: false, _initialized: true });
    } catch {
      set({ loading: false });
    }
  },

  add: async (record: FormRecord) => {
    const prev = get().records;
    // 乐观更新：替换已有或追加
    const exists = prev.some((r) => r.id === record.id);
    const next = exists ? prev.map((r) => (r.id === record.id ? record : r)) : [...prev, record];
    set({ records: next });
    try {
      await db.putRecord(record);
    } catch {
      // 回滚
      set({ records: prev });
      throw new Error('Failed to save record to IndexedDB');
    }
  },

  update: async (record: FormRecord) => {
    // update 与 add 语义一致（put）
    await get().add(record);
  },

  remove: async (id: string) => {
    const prev = get().records;
    const next = prev.filter((r) => r.id !== id);
    set({ records: next });
    try {
      await db.deleteRecord(id);
    } catch {
      // 回滚
      set({ records: prev });
      throw new Error('Failed to delete record from IndexedDB');
    }
  },

  getByProblem: (problemId: string) => {
    return get().records.filter((r) => r.problemId === problemId);
  },
}));
