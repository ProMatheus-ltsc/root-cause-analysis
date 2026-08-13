/**
 * Zustand store：管理 Problem[] 状态，提供 fetch/add/update/remove 方法。
 * 乐观更新：先修改本地 state，再异步写入 IndexedDB；写入失败时回滚。
 *
 * 扮演的角色：问题（Problem）数据的"全局仓库"。IndexedDB 是真正的持久化层，
 * store 是"内存缓存层"——界面读写都走 store，store 再异步同步给 IndexedDB。
 *
 * 核心概念（初学者向）：
 *   1. Zustand 的 create 会生成一个 React hook（useProblemStore），
 *      组件用 selector 订阅其中一部分状态，变化时才重渲染。
 *   2. 乐观更新（optimistic update）：先更新内存让界面"秒变"，再去写数据库。
 *      如果数据库写入失败，就把内存恢复成写之前的样子（回滚），并抛出错误。
 *      好处是操作体验流畅，代价是需要额外的回滚逻辑。
 *   3. 静默刷新：首次 fetch 显示 loading，之后再次 fetch 不再闪 loading，
 *      因为此时数据已经展示在界面上了。
 */
import { create } from 'zustand';
import type { Problem } from '../types';
import * as db from '../services/db';

/** 问题 store 的状态与操作方法 */
export interface ProblemState {
  /** 全部问题列表 */
  problems: Problem[];
  /** 是否正在首次加载 */
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

// create((set, get) => ...)：set 用来改 state，get 用来读取当前最新 state。
// 之所以用 get() 而不是闭包变量，是因为 store 方法之间需要拿到"最新的"数据。
export const useProblemStore = create<ProblemState>((set, get) => ({
  problems: [],
  loading: true,
  _initialized: false,

  fetch: async () => {
    // 只有"从未加载过"时才显示 loading；已加载过则是静默刷新，不打扰正在浏览的用户
    if (!get()._initialized) {
      set({ loading: true });
    }
    try {
      // IndexedDB 的 API 是异步的，await 等待结果返回
      const fresh = await db.getAllProblems();
      set({ problems: fresh, loading: false, _initialized: true });
    } catch {
      // 拉取失败也结束 loading（数据保留旧值），避免界面永远卡在加载中
      set({ loading: false });
    }
  },

  add: async (problem: Problem) => {
    // 记住写入前的旧列表，供失败时回滚
    const prev = get().problems;
    // 乐观更新：替换已有或追加
    const exists = prev.some((p) => p.id === problem.id);
    // 若已存在同 id 则替换该条（等同更新），否则追加到末尾（等同新增）
    const next = exists ? prev.map((p) => (p.id === problem.id ? problem : p)) : [...prev, problem];
    // 第一步：先更新内存，界面立即反映变化
    set({ problems: next });
    try {
      // 第二步：再异步写入 IndexedDB 做持久化
      await db.putProblem(problem);
    } catch {
      // 回滚：写入失败时把内存恢复成旧列表，保证界面和数据库一致
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
    // 乐观更新：先从内存移除该问题，界面立即消失
    const next = prev.filter((p) => p.id !== id);
    set({ problems: next });
    try {
      // 再异步从 IndexedDB 删除
      await db.deleteProblem(id);
    } catch {
      // 回滚：删除失败时把问题放回列表
      set({ problems: prev });
      throw new Error('Failed to delete problem from IndexedDB');
    }
  },
}));
