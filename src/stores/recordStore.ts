/**
 * Zustand store：管理 FormRecord[] 状态，提供 fetch/add/update/remove/getByProblem 方法。
 * 乐观更新：先修改本地 state，再异步写入 IndexedDB；写入失败时回滚。
 *
 * 扮演的角色：表单记录（FormRecord）数据的"全局仓库"，与 problemStore 互为镜像：
 * problemStore 管问题、recordStore 管记录，两者通过 hooks 层的互相刷新保持联动。
 *
 * 核心概念（初学者向）：
 *   1. 乐观更新 + 回滚：见 problemStore 文件头，两份 store 采用同一套策略。
 *   2. getByProblem 是"派生查询"：不访问数据库，而是直接从内存里的全量 records
 *      过滤出某个问题下的记录，速度最快，也省去一次异步查询。
 */
import { create } from 'zustand';
import type { FormRecord } from '../types';
import * as db from '../services/db';

/** 记录 store 的状态与操作方法 */
export interface RecordState {
  /** 全部记录列表 */
  records: FormRecord[];
  /** 是否正在首次加载 */
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

// set 用来修改 state，get 用来读取最新 state（方法之间共享"最新数据"需要它）
export const useRecordStore = create<RecordState>((set, get) => ({
  records: [],
  loading: true,
  _initialized: false,

  fetch: async () => {
    // 仅首次加载显示 loading；之后是静默刷新
    if (!get()._initialized) {
      set({ loading: true });
    }
    try {
      const fresh = await db.getAllRecords();
      set({ records: fresh, loading: false, _initialized: true });
    } catch {
      // 拉取失败保留旧数据，只结束 loading
      set({ loading: false });
    }
  },

  add: async (record: FormRecord) => {
    // 保存写入前的旧列表，供失败回滚
    const prev = get().records;
    // 乐观更新：替换已有或追加
    const exists = prev.some((r) => r.id === record.id);
    // 同 id 则替换（更新），否则追加（新增）
    const next = exists ? prev.map((r) => (r.id === record.id ? record : r)) : [...prev, record];
    // 第一步：先更新内存，界面立即变化
    set({ records: next });
    try {
      // 第二步：异步写入 IndexedDB 持久化
      await db.putRecord(record);
    } catch {
      // 回滚：失败时恢复旧列表
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
    // 乐观更新：先从内存移除
    const next = prev.filter((r) => r.id !== id);
    set({ records: next });
    try {
      await db.deleteRecord(id);
    } catch {
      // 回滚：删除失败时恢复
      set({ records: prev });
      throw new Error('Failed to delete record from IndexedDB');
    }
  },

  getByProblem: (problemId: string) => {
    // 纯内存派生查询：不需要访问数据库，也不触发异步
    return get().records.filter((r) => r.problemId === problemId);
  },
}));
