/**
 * 快照（Snapshot）hooks：针对某条表单记录，提供"保存进度快照 / 查看历史快照 / 删除快照"能力。
 *
 * 扮演的角色：版本回溯功能。用户在填写根因分析表单时，可以随时把当前填写内容存成一份快照，
 * 之后可以查看历史快照、对照当时的填写状态。
 *
 * 核心概念：
 *   - IndexedDB 的 API 全部是异步的（返回 Promise），所以每个操作都要 await；
 *   - 快照按 recordId 分组存储，这里通过"每次读写后重新拉取列表"来保证界面上数据最新；
 *   - 每份记录最多保留 MAX_SNAPSHOTS_PER_RECORD 条，超出就删除最旧的，防止无限膨胀。
 */
import { useCallback, useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { format } from 'date-fns';
import type { Snapshot } from '../services/db';
import { getSnapshotsByRecord, putSnapshot, deleteSnapshot } from '../services/db';

// 每条记录最多保留的快照数：超过后删除最旧的，避免 IndexedDB 存储无限增长
const MAX_SNAPSHOTS_PER_RECORD = 20;

/**
 * 快照 hook。
 * @param recordId 目标记录的 id；为空时表示没有目标，快照列表清空
 * @returns { snapshots, loading, createSnapshot, removeSnapshot, refresh }
 *   - snapshots：该记录的所有快照，按创建时间从新到旧排序
 *   - createSnapshot：保存一份当前数据的快照
 *   - removeSnapshot：按 id 删除某份快照
 *   - refresh：重新拉取快照列表（手动刷新入口）
 */
export function useSnapshots(recordId: string | undefined) {
  // 该记录的全部快照列表
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  // 是否正在从 IndexedDB 拉取数据
  const [loading, setLoading] = useState(false);

  /**
   * 重新从 IndexedDB 拉取快照列表并更新 state。
   * 用 useCallback 包裹 + 依赖 [recordId]：recordId 不变时 refresh 引用稳定，
   * 这样下面的 useEffect 不会因为每次渲染拿到新的 refresh 而重复触发。
   */
  const refresh = useCallback(async () => {
    // 没有目标记录时直接清空列表，不做无意义的查询
    if (!recordId) {
      setSnapshots([]);
      return;
    }
    setLoading(true);
    try {
      const all = await getSnapshotsByRecord(recordId);
      // 按 createdAt 字符串倒序排序（ISO 时间字符串可直接按字典序比较），新的排前面
      all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setSnapshots(all);
    } finally {
      // 无论成功失败都结束 loading，防止界面一直转圈
      setLoading(false);
    }
  }, [recordId]);

  // 挂载时（或 recordId 变化时）自动拉取一次快照列表
  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * 把当前表单数据保存为一份新快照。
   * @param data 要保存的表单数据（用 structuredClone 深拷贝，避免后续修改数据时串改快照）
   * @param label 快照备注，缺省时自动生成"快照 时间"这样的名字
   */
  const createSnapshot = useCallback(
    async (data: Record<string, unknown>, label?: string) => {
      if (!recordId) return;
      const snapshot: Snapshot = {
        id: uuid(), // 快照也用 uuid 保证唯一
        recordId,
        // structuredClone 做深拷贝：直接存引用的话，后续用户编辑会污染这份快照
        data: structuredClone(data),
        label: label || `快照 ${format(new Date(), 'MM-dd HH:mm:ss')}`,
        createdAt: new Date().toISOString(),
      };
      // 写入 IndexedDB
      await putSnapshot(snapshot);

      // 重新读取最新列表，判断是否超出数量上限
      const updated = await getSnapshotsByRecord(recordId);
      updated.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      // 超出上限时，把最旧的（列表末尾）一批删掉
      if (updated.length > MAX_SNAPSHOTS_PER_RECORD) {
        const toDelete = updated.slice(MAX_SNAPSHOTS_PER_RECORD);
        for (const s of toDelete) {
          await deleteSnapshot(s.id);
        }
      }

      // 最后统一刷新一次界面列表，保证展示与存储一致
      await refresh();
    },
    [recordId, refresh],
  );

  /** 按 id 删除一份快照，删除后刷新列表 */
  const removeSnapshot = useCallback(
    async (id: string) => {
      await deleteSnapshot(id);
      await refresh();
    },
    [refresh],
  );

  return { snapshots, loading, createSnapshot, removeSnapshot, refresh };
}
