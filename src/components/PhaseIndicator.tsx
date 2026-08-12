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
    <nav className="no-print mb-6 flex flex-wrap gap-2 border-b border-surface-200 pb-4" aria-label="分析阶段">
      {phases.map((phase, idx) => {
        const locked = isSectionLocked(idx);
        const readOnly = isSectionReadOnly(idx);
        const active = idx === activePhaseIndex;
        return (
          <button
            key={phase.id}
            type="button"
            onClick={() => (locked ? onLockedClick(idx) : onSelect(idx))}
            aria-current={active ? 'step' : undefined}
            aria-disabled={locked}
            className={clsx(
              'flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all',
              active ? 'bg-brand-600 text-white shadow-sm shadow-brand-200' : 'bg-surface-100 text-text-secondary hover:bg-surface-200',
              locked && 'cursor-not-allowed opacity-50',
              readOnly && !locked && !active && 'bg-success/10 text-success',
            )}
          >
            <span>{phase.icon}</span>
            <span>{phase.label}</span>
            {locked && <span className="text-xs">🔒</span>}
            {readOnly && !locked && <span className="text-xs">✓</span>}
          </button>
        );
      })}
    </nav>
  );
}
