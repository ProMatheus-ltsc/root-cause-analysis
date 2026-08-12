import { useCallback, useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { format } from 'date-fns';
import type { Snapshot } from '../services/db';
import { getSnapshotsByRecord, putSnapshot, deleteSnapshot } from '../services/db';

const MAX_SNAPSHOTS_PER_RECORD = 20;

export function useSnapshots(recordId: string | undefined) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!recordId) {
      setSnapshots([]);
      return;
    }
    setLoading(true);
    try {
      const all = await getSnapshotsByRecord(recordId);
      all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setSnapshots(all);
    } finally {
      setLoading(false);
    }
  }, [recordId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createSnapshot = useCallback(
    async (data: Record<string, unknown>, label?: string) => {
      if (!recordId) return;
      const snapshot: Snapshot = {
        id: uuid(),
        recordId,
        data: structuredClone(data),
        label: label || `快照 ${format(new Date(), 'MM-dd HH:mm:ss')}`,
        createdAt: new Date().toISOString(),
      };
      await putSnapshot(snapshot);

      const updated = await getSnapshotsByRecord(recordId);
      updated.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      if (updated.length > MAX_SNAPSHOTS_PER_RECORD) {
        const toDelete = updated.slice(MAX_SNAPSHOTS_PER_RECORD);
        for (const s of toDelete) {
          await deleteSnapshot(s.id);
        }
      }

      await refresh();
    },
    [recordId, refresh],
  );

  const removeSnapshot = useCallback(
    async (id: string) => {
      await deleteSnapshot(id);
      await refresh();
    },
    [refresh],
  );

  return { snapshots, loading, createSnapshot, removeSnapshot, refresh };
}
