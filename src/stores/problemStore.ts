/**
 * Zustand store：管理 Problem[] 状态，提供 fetch/add/update/remove 方法。
 * 乐观更新：先修改本地 state，再异步写入 IndexedDB；写入失败时回滚。
 */
import { create } from 'zustand';
import type { Problem } from '../types';
import * as db from '../services/db';

export interface ProblemState {
  problems: Problem[];
  loading: boolean;
  /** 首次加载是否已完成 */
  _initialized: boolean;

  /** 从 IndexedDB 拉取全量数据（首次调用 loading=true，后续静默刷新） */
  fetch: () => Promise<void>;
  /** 新增或更新问题（乐观更新） */
  add: (problem: Problem) => Promise<void>;
  /** 更新问题（等同 add，put 语义） */
  update: (problem: Problem) => Promise<void>;
  /** 删除问题（乐观更新） */
  remove: (id: string) => Promise<void>;
}

export const useProblemStore = create<ProblemState>((set, get) => ({
  problems: [],
  loading: true,
  _initialized: false,

  fetch: async () => {
    if (!get()._initialized) {
      set({ loading: true });
    }
    try {
      const fresh = await db.getAllProblems();
      set({ problems: fresh, loading: false, _initialized: true });
    } catch {
      set({ loading: false });
    }
  },

  add: async (problem: Problem) => {
    const prev = get().problems;
    // 乐观更新：替换已有或追加
    const exists = prev.some((p) => p.id === problem.id);
    const next = exists ? prev.map((p) => (p.id === problem.id ? problem : p)) : [...prev, problem];
    set({ problems: next });
    try {
      await db.putProblem(problem);
    } catch {
      // 回滚
      set({ problems: prev });
      throw new Error('Failed to save problem to IndexedDB');
    }
  },

  update: async (problem: Problem) => {
    // update 与 add 语义一致（put）
    await get().add(problem);
  },

  remove: async (id: string) => {
    const prev = get().problems;
    const next = prev.filter((p) => p.id !== id);
    set({ problems: next });
    try {
      await db.deleteProblem(id);
    } catch {
      // 回滚
      set({ problems: prev });
      throw new Error('Failed to delete problem from IndexedDB');
    }
  },
}));
