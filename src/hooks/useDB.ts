/**
 * 记录 CRUD hooks：基于 Zustand store 实现，通过 selector 细粒度订阅，
 * 让组件只在关心的数据变化时重渲染。
 *
 * 向后兼容：所有使用 useDB hooks 的组件无需修改，接口签名保持不变。
 *
 * 核心概念（初学者向）：
 *   - Zustand 是一个轻量状态管理库，store 就是一份全局共享的数据 + 修改它的方法。
 *   - selector 是"选数据"的函数，useProblemStore(selector) 订阅 selector 的返回值：
 *     只有返回值变化时，组件才会重渲染。这是"细粒度订阅"的关键。
 *   - useShallow 做浅比较：selector 返回对象时，如果内部每个字段都没变，
 *     就认为结果没变，避免因对象引用变化导致的无谓重渲染。
 *   - 本文件是"桥接层"：把 store 数据包装成与旧接口一致的 React hooks，组件只管调用。
 */
import { useCallback, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useShallow } from 'zustand/react/shallow';
import type { FormRecord, Problem, TemplateId } from '../types';
import { useProblemStore } from '../stores/problemStore';
import { useRecordStore } from '../stores/recordStore';

// ─── Problem hooks ─────────────────────────────────────────────────────

/**
 * 获取全部问题的 hook。返回 { problems, loading, reload }。
 * 组件挂载后自动拉取一次数据；reload 可在需要时手动重新拉取。
 */
export function useProblems(): { problems: Problem[]; loading: boolean; reload: () => Promise<void> } {
  // 用 selector 只订阅"本组件关心的三样东西"，其余 state 变化不会触发本组件重渲染
  const { problems, loading, fetch } = useProblemStore(
    useShallow((s) => ({ problems: s.problems, loading: s.loading, fetch: s.fetch }))
  );

  // 挂载后自动执行 fetch()（依赖数组 [fetch]：fetch 引用稳定，因此只在首次挂载时触发一次）
  useEffect(() => {
    fetch();
  }, [fetch]);

  // reload 直接复用它 fetch：语义上"重新加载"与 store 的 fetch 完全一致
  return { problems, loading, reload: fetch };
}

/**
 * 按 id 获取单个问题的 hook。id 为空时返回 undefined（不报错）。
 * 数据仍来自 store 中的全量列表，通过 useMemo 在内存中查找，避免每次渲染都重新 find。
 */
export function useProblem(id: string | undefined): {
  problem: Problem | undefined;
  loading: boolean;
  reload: () => Promise<void>;
} {
  const { problems, loading, fetch } = useProblemStore(
    useShallow((s) => ({ problems: s.problems, loading: s.loading, fetch: s.fetch }))
  );

  useEffect(() => {
    fetch();
  }, [fetch]);

  // useMemo 缓存查找结果：只有当 problems 或 id 变化时才重新 find，
  // 其他情况下复用上次的结果，减少无意义的计算
  const problem = useMemo(() => {
    if (!id) return undefined;
    return problems.find((p) => p.id === id);
  }, [problems, id]);

  return { problem, loading, reload: fetch };
}

/** 保存问题时的参数：id 不传则视为新建，传入则视为更新 */
export interface SaveProblemParams {
  /** 问题 id（缺省时自动生成） */
  id?: string;
  /** 问题标题 */
  title: string;
  /** 问题描述（根因分析的背景陈述） */
  problemStatement: string;
  /** 动态表单数据，键值对形式 */
  data: Record<string, unknown>;
  /** 创建时间（缺省时取当前时间） */
  createdAt?: string;
}

/**
 * 返回一个"保存问题"函数（闭包）的 hook。返回的函数：
 * 组装 Problem 对象 → 写入 problem store → 顺带刷新 record store（保持跨 store 联动）→ 返回保存结果。
 */
export function useSaveProblem(): (params: SaveProblemParams) => Promise<Problem> {
  // 从 problem store 取"新增/更新"方法
  const add = useProblemStore((s) => s.add);
  // 同时触发 record store 刷新（保持原有跨 store 联动行为）
  const fetchRecords = useRecordStore((s) => s.fetch);

  // useCallback 让返回的函数引用稳定：只要依赖（add/fetchRecords）不变，
  // 这个函数每次渲染都是同一个引用，不会破坏依赖它的 useEffect
  return useCallback(
    async (params: SaveProblemParams) => {
      // 统一用当前时间戳，保证 createdAt/updatedAt 一致
      const now = new Date().toISOString();
      // 组装完整的 Problem 对象：id 缺省时用 uuid 生成
      const problem: Problem = {
        id: params.id ?? uuidv4(),
        title: params.title,
        problemStatement: params.problemStatement,
        data: params.data,
        createdAt: params.createdAt ?? now,
        updatedAt: now,
      };
      // 写入 store（内部走 IndexedDB 持久化）
      await add(problem);
      // 通知 record store 刷新（原有事件总线行为：问题/记录变更互相感知）
      fetchRecords();
      return problem;
    },
    [add, fetchRecords]
  );
}

/**
 * 返回一个"删除问题"函数（闭包）的 hook。删除后同样刷新 record store，
 * 让"问题详情下关联的记录列表"立即更新。
 */
export function useDeleteProblem(): (id: string) => Promise<void> {
  const remove = useProblemStore((s) => s.remove);
  const fetchRecords = useRecordStore((s) => s.fetch);

  return useCallback(
    async (id: string) => {
      await remove(id);
      // 问题被删后，关联记录可能也随之变化，通知 record store 重新拉取
      fetchRecords();
    },
    [remove, fetchRecords]
  );
}

// ─── Record hooks ──────────────────────────────────────────────────────

/**
 * 获取全部记录（表单记录）的 hook。行为与 useProblems 相同：挂载即拉取，返回列表与 loading。
 */
export function useRecords(): { records: FormRecord[]; loading: boolean; reload: () => Promise<void> } {
  const { records, loading, fetch } = useRecordStore(
    useShallow((s) => ({ records: s.records, loading: s.loading, fetch: s.fetch }))
  );

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { records, loading, reload: fetch };
}

/**
 * 获取某个问题下所有记录的 hook。
 * 注意这里不重复请求 IndexedDB，而是在全量记录上做内存过滤（useMemo 派生数据），
 * 只有全量列表或 problemId 变化时才重新过滤。
 */
export function useRecordsByProblem(problemId: string | undefined): {
  records: FormRecord[];
  loading: boolean;
  reload: () => Promise<void>;
} {
  const { records: allRecords, loading, fetch } = useRecordStore(
    useShallow((s) => ({ records: s.records, loading: s.loading, fetch: s.fetch }))
  );

  useEffect(() => {
    fetch();
  }, [fetch]);

  // useMemo 派生：按 problemId 过滤，problemId 为空时返回空数组
  const records = useMemo(() => {
    if (!problemId) return [];
    return allRecords.filter((r) => r.problemId === problemId);
  }, [allRecords, problemId]);

  return { records, loading, reload: fetch };
}

/**
 * 按 id 获取单条记录的 hook。id 为空时返回 undefined。
 */
export function useRecord(id: string | undefined): {
  record: FormRecord | undefined;
  loading: boolean;
  reload: () => Promise<void>;
} {
  const { records, loading, fetch } = useRecordStore(
    useShallow((s) => ({ records: s.records, loading: s.loading, fetch: s.fetch }))
  );

  useEffect(() => {
    fetch();
  }, [fetch]);

  // useMemo 缓存查找结果，避免每次渲染都做一次 find
  const record = useMemo(() => {
    if (!id) return undefined;
    return records.find((r) => r.id === id);
  }, [records, id]);

  return { record, loading, reload: fetch };
}

/** 保存记录时的参数 */
export interface SaveRecordParams {
  /** 记录 id（缺省时自动生成，作为新记录插入） */
  id?: string;
  /** 记录使用的模板 id（决定渲染哪个表单） */
  templateId: TemplateId;
  /** 关联的问题 id（可空，表示独立记录） */
  problemId?: string;
  /** 记录标题 */
  title: string;
  /** 动态表单数据，键值对形式 */
  data: Record<string, unknown>;
  /** 记录状态：草稿 或 已完成 */
  status: 'draft' | 'completed';
  /** 创建时间（缺省时取当前时间） */
  createdAt?: string;
}

/**
 * 返回一个"保存记录"函数（闭包）的 hook。
 * 保存后反向刷新 problem store，保持"问题/记录变更互相感知"的联动行为。
 */
export function useSaveRecord(): (params: SaveRecordParams) => Promise<FormRecord> {
  const add = useRecordStore((s) => s.add);
  const fetchProblems = useProblemStore((s) => s.fetch);

  return useCallback(
    async (params: SaveRecordParams) => {
      // 统一时间戳：让 createdAt/updatedAt 基于同一次"当前时间"
      const now = new Date().toISOString();
      // 组装完整的 FormRecord 对象
      const record: FormRecord = {
        id: params.id ?? uuidv4(),
        templateId: params.templateId,
        problemId: params.problemId,
        title: params.title,
        data: params.data,
        status: params.status,
        createdAt: params.createdAt ?? now,
        updatedAt: now,
      };
      await add(record);
      // 通知 problem store 刷新（保持原有事件总线行为）
      fetchProblems();
      return record;
    },
    [add, fetchProblems]
  );
}

/**
 * 返回一个"删除记录"函数（闭包）的 hook。删除后刷新 problem store，
 * 让依赖记录数据的问题相关界面（如完成度统计）立即更新。
 */
export function useDeleteRecord(): (id: string) => Promise<void> {
  const remove = useRecordStore((s) => s.remove);
  const fetchProblems = useProblemStore((s) => s.fetch);

  return useCallback(
    async (id: string) => {
      await remove(id);
      fetchProblems();
    },
    [remove, fetchProblems]
  );
}

/**
 * 纯前端搜索过滤：根据 query 在记录列表里过滤出匹配项。
 * 匹配范围包括标题和表单数据（把 data 序列化成 JSON 再搜索）。
 * useMemo 缓存结果：只有当记录列表或 query 变化时才重新过滤。
 */
export function useSearchRecords(records: FormRecord[], query: string): FormRecord[] {
  return useMemo(() => {
    // 统一转小写并去首尾空格，实现大小写不敏感搜索
    const q = query.trim().toLowerCase();
    // 空搜索词直接返回全部记录
    if (!q) return records;
    // 标题包含关键词，或表单数据 JSON 里包含关键词（如"负责人"、"日期"等字段值）
    return records.filter((r) => r.title.toLowerCase().includes(q) || JSON.stringify(r.data).toLowerCase().includes(q));
  }, [records, query]);
}
