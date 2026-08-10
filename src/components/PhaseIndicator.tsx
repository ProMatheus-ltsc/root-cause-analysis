/**
 * 阶段进度条：横向 Tab，锁定阶段显示 🔒；点击锁定 Tab 不切换，交由 onLockedClick 提示原因。
 */
import clsx from 'clsx';
import type { PhaseConfig } from '../types';

interface PhaseIndicatorProps {
  phases: PhaseConfig[];
  activePhaseIndex: number;
  isSectionLocked: (idx: number) => boolean;
  isSectionReadOnly: (idx: number) => boolean;
  onSelect: (idx: number) => void;
  onLockedClick: (idx: number) => void;
}

export function PhaseIndicator({
  phases,
  activePhaseIndex,
  isSectionLocked,
  isSectionReadOnly,
  onSelect,
  onLockedClick,
}: PhaseIndicatorProps) {
  return (
    <div className="no-print mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
      {phases.map((phase, idx) => {
        const locked = isSectionLocked(idx);
        const readOnly = isSectionReadOnly(idx);
        const active = idx === activePhaseIndex;
        return (
          <button
            key={phase.id}
            type="button"
            onClick={() => (locked ? onLockedClick(idx) : onSelect(idx))}
            className={clsx(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition',
              active ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              locked && 'cursor-not-allowed opacity-60',
            )}
          >
            <span>{phase.icon}</span>
            <span>{phase.label}</span>
            {locked && <span>🔒</span>}
            {readOnly && !locked && <span>✓</span>}
          </button>
        );
      })}
    </div>
  );
}
