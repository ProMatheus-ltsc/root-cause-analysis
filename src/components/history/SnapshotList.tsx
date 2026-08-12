import { format } from 'date-fns';
import type { Snapshot } from '../../services/db';

interface SnapshotListProps {
  snapshots: Snapshot[];
  loading: boolean;
  onRestore: (snapshot: Snapshot) => void;
  onDelete: (id: string) => void;
  onCreateSnapshot: () => void;
}

export function SnapshotList({ snapshots, loading, onRestore, onDelete, onCreateSnapshot }: SnapshotListProps) {
  if (loading) {
    return <p className="text-xs text-text-tertiary">加载版本历史…</p>;
  }

  return (
    <div className="rounded-xl border border-surface-200 bg-surface-0 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          版本历史
        </h4>
        <button
          type="button"
          onClick={onCreateSnapshot}
          className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 transition"
        >
          创建快照
        </button>
      </div>

      {snapshots.length === 0 ? (
        <p className="text-xs text-text-tertiary py-2">暂无版本历史。点击"创建快照"保存当前状态。</p>
      ) : (
        <div className="max-h-48 overflow-y-auto space-y-2">
          {snapshots.map((snapshot) => (
            <div
              key={snapshot.id}
              className="flex items-center justify-between rounded-lg border border-surface-100 bg-surface-50 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-text-primary truncate">{snapshot.label}</p>
                <p className="text-[10px] text-text-tertiary">
                  {format(new Date(snapshot.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <button
                  type="button"
                  onClick={() => onRestore(snapshot)}
                  className="rounded-md bg-brand-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-brand-700 transition"
                >
                  恢复
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(snapshot.id)}
                  className="rounded-md text-[11px] text-text-tertiary hover:text-danger-600 transition"
                  aria-label="删除快照"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {snapshots.length > 0 && (
        <p className="text-[10px] text-text-tertiary">最多保留 20 个快照，超出后自动清理最早的记录。</p>
      )}
    </div>
  );
}
