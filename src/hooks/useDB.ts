/**
 * 记录 CRUD hooks：封装 services/db.ts 的 IndexedDB 操作，用轻量事件总线让多个页面
 * 在记录新增/更新/删除后能互相感知并刷新列表。
 * 注意：reload 只在"首次加载"时把 loading 置为 true；被 notifyRecordsChanged 广播触发的
 * 后台静默刷新不会再翻转 loading——否则正在编辑表单的 FormPage 会在每次自动保存/切换阶段
 * 触发的保存广播后短暂把 loading 判定为 true，导致 FormRenderer 被整体卸载重新挂载，
 * 使用户当时正在输入的内容丢失、页面出现闪烁。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { FormRecord, Problem, TemplateId } from '../types';
import * as db from '../services/db';

type Listener = () => void;
const listeners = new Set<Listener>();
function notifyRecordsChanged(): void {
  listeners.forEach((listener) => listener());
}

/** 问题实体 hooks：与记录共用同一事件总线，问题/记录变更互相感知刷新。 */

export function useProblems(): { problems: Problem[]; loading: boolean; reload: () => Promise<void> } {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedOnceRef = useRef(false);

  const reload = useCallback(async () => {
    if (!hasLoadedOnceRef.current) setLoading(true);
    const fresh = await db.getAllProblems();
    setProblems(fresh);
    setLoading(false);
    hasLoadedOnceRef.current = true;
  }, []);

  useEffect(() => {
    reload();
    listeners.add(reload);
    return () => {
      listeners.delete(reload);
    };
  }, [reload]);

  return { problems, loading, reload };
}

export function useProblem(id: string | undefined): {
  problem: Problem | undefined;
  loading: boolean;
  reload: () => Promise<void>;
} {
  const [problem, setProblem] = useState<Problem | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const loadedForIdRef = useRef<string | undefined>(undefined);

  const reload = useCallback(async () => {
    if (!id) {
      setProblem(undefined);
      setLoading(false);
      loadedForIdRef.current = undefined;
      return;
    }
    if (loadedForIdRef.current !== id) setLoading(true);
    const fresh = await db.getProblem(id);
    setProblem(fresh);
    setLoading(false);
    loadedForIdRef.current = id;
  }, [id]);

  useEffect(() => {
    reload();
    listeners.add(reload);
    return () => {
      listeners.delete(reload);
    };
  }, [reload]);

  return { problem, loading, reload };
}

export interface SaveProblemParams {
  id?: string;
  title: string;
  problemStatement: string;
  data: Record<string, unknown>;
  createdAt?: string;
}

export function useSaveProblem(): (params: SaveProblemParams) => Promise<Problem> {
  return useCallback(async (params: SaveProblemParams) => {
    const now = new Date().toISOString();
    const problem: Problem = {
      id: params.id ?? uuidv4(),
      title: params.title,
      problemStatement: params.problemStatement,
      data: params.data,
      createdAt: params.createdAt ?? now,
      updatedAt: now,
    };
    await db.putProblem(problem);
    notifyRecordsChanged();
    return problem;
  }, []);
}

export function useDeleteProblem(): (id: string) => Promise<void> {
  return useCallback(async (id: string) => {
    await db.deleteProblem(id);
    notifyRecordsChanged();
  }, []);
}

export function useRecords(): { records: FormRecord[]; loading: boolean; reload: () => Promise<void> } {
  const [records, setRecords] = useState<FormRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedOnceRef = useRef(false);

  const reload = useCallback(async () => {
    if (!hasLoadedOnceRef.current) setLoading(true);
    const fresh = await db.getAllRecords();
    setRecords(fresh);
    setLoading(false);
    hasLoadedOnceRef.current = true;
  }, []);

  useEffect(() => {
    reload();
    listeners.add(reload);
    return () => {
      listeners.delete(reload);
    };
  }, [reload]);

  return { records, loading, reload };
}

export function useRecordsByProblem(problemId: string | undefined): {
  records: FormRecord[];
  loading: boolean;
  reload: () => Promise<void>;
} {
  const [records, setRecords] = useState<FormRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedForIdRef = useRef<string | undefined>(undefined);

  const reload = useCallback(async () => {
    if (!problemId) {
      setRecords([]);
      setLoading(false);
      loadedForIdRef.current = undefined;
      return;
    }
    if (loadedForIdRef.current !== problemId) setLoading(true);
    const fresh = await db.getRecordsByProblem(problemId);
    setRecords(fresh);
    setLoading(false);
    loadedForIdRef.current = problemId;
  }, [problemId]);

  useEffect(() => {
    reload();
    listeners.add(reload);
    return () => {
      listeners.delete(reload);
    };
  }, [reload]);

  return { records, loading, reload };
}

export function useRecord(id: string | undefined): {
  record: FormRecord | undefined;
  loading: boolean;
  reload: () => Promise<void>;
} {  const [record, setRecord] = useState<FormRecord | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const loadedForIdRef = useRef<string | undefined>(undefined);

  const reload = useCallback(async () => {
    if (!id) {
      setRecord(undefined);
      setLoading(false);
      loadedForIdRef.current = undefined;
      return;
    }
    if (loadedForIdRef.current !== id) setLoading(true);
    const fresh = await db.getRecord(id);
    setRecord(fresh);
    setLoading(false);
    loadedForIdRef.current = id;
  }, [id]);

  useEffect(() => {
    reload();
    listeners.add(reload);
    return () => {
      listeners.delete(reload);
    };
  }, [reload]);

  return { record, loading, reload };
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
  return useCallback(async (params: SaveRecordParams) => {
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
    await db.putRecord(record);
    notifyRecordsChanged();
    return record;
  }, []);
}

export function useDeleteRecord(): (id: string) => Promise<void> {
  return useCallback(async (id: string) => {
    await db.deleteRecord(id);
    notifyRecordsChanged();
  }, []);
}

export function useSearchRecords(records: FormRecord[], query: string): FormRecord[] {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => r.title.toLowerCase().includes(q) || JSON.stringify(r.data).toLowerCase().includes(q));
  }, [records, query]);
}
