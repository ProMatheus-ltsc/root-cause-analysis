/**
 * 记录 CRUD hooks：基于 Zustand store 实现，通过 selector 细粒度订阅，
 * 让组件只在关心的数据变化时重渲染。
 *
 * 向后兼容：所有使用 useDB hooks 的组件无需修改，接口签名保持不变。
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useShallow } from 'zustand/react/shallow';
import type { FormRecord, Problem, TemplateId } from '../types';
import { useProblemStore } from '../stores/problemStore';
import { useRecordStore } from '../stores/recordStore';

// ─── Problem hooks ─────────────────────────────────────────────────────

export function useProblems(): { problems: Problem[]; loading: boolean; reload: () => Promise<void> } {
  const { problems, loading, fetch } = useProblemStore(
    useShallow((s) => ({ problems: s.problems, loading: s.loading, fetch: s.fetch }))
  );

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { problems, loading, reload: fetch };
}

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

  const problem = useMemo(() => {
    if (!id) return undefined;
    return problems.find((p) => p.id === id);
  }, [problems, id]);

  return { problem, loading, reload: fetch };
}

export interface SaveProblemParams {
  id?: string;
  title: string;
  problemStatement: string;
  data: Record<string, unknown>;
  createdAt?: string;
}

export function useSaveProblem(): (params: SaveProblemParams) => Promise<Problem> {
  const add = useProblemStore((s) => s.add);
  // 同时触发 record store 刷新（保持原有跨 store 联动行为）
  const fetchRecords = useRecordStore((s) => s.fetch);

  return useCallback(
    async (params: SaveProblemParams) => {
      const now = new Date().toISOString();
      const problem: Problem = {
        id: params.id ?? uuidv4(),
        title: params.title,
        problemStatement: params.problemStatement,
        data: params.data,
        createdAt: params.createdAt ?? now,
        updatedAt: now,
      };
      await add(problem);
      // 通知 record store 刷新（原有事件总线行为：问题/记录变更互相感知）
      fetchRecords();
      return problem;
    },
    [add, fetchRecords]
  );
}

export function useDeleteProblem(): (id: string) => Promise<void> {
  const remove = useProblemStore((s) => s.remove);
  const fetchRecords = useRecordStore((s) => s.fetch);

  return useCallback(
    async (id: string) => {
      await remove(id);
      fetchRecords();
    },
    [remove, fetchRecords]
  );
}

// ─── Record hooks ──────────────────────────────────────────────────────

export function useRecords(): { records: FormRecord[]; loading: boolean; reload: () => Promise<void> } {
  const { records, loading, fetch } = useRecordStore(
    useShallow((s) => ({ records: s.records, loading: s.loading, fetch: s.fetch }))
  );

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { records, loading, reload: fetch };
}

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

  const records = useMemo(() => {
    if (!problemId) return [];
    return allRecords.filter((r) => r.problemId === problemId);
  }, [allRecords, problemId]);

  return { records, loading, reload: fetch };
}

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

  const record = useMemo(() => {
    if (!id) return undefined;
    return records.find((r) => r.id === id);
  }, [records, id]);

  return { record, loading, reload: fetch };
}

export interface SaveRecordParams {
  id?: string;
  templateId: TemplateId;
  problemId?: string;
  title: string;
  data: Record<string, unknown>;
  status: 'draft' | 'completed';
  createdAt?: string;
}

export function useSaveRecord(): (params: SaveRecordParams) => Promise<FormRecord> {
  const add = useRecordStore((s) => s.add);
  const fetchProblems = useProblemStore((s) => s.fetch);

  return useCallback(
    async (params: SaveRecordParams) => {
      const now = new Date().toISOString();
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

export function useSearchRecords(records: FormRecord[], query: string): FormRecord[] {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => r.title.toLowerCase().includes(q) || JSON.stringify(r.data).toLowerCase().includes(q));
  }, [records, query]);
}
