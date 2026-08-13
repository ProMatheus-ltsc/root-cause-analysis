/**
 * 阶段进度条：横向 Tab，锁定阶段显示 🔒；点击锁定 Tab 不切换，交由 onLockedClick 提示原因。
 * 展示多阶段表单的分析进度，让用户直观看到当前处于第几步、哪些阶段已完成/只读/锁定。
 */
import clsx from 'clsx';
import type { PhaseConfig } from '../types';

interface PhaseIndicatorProps {
  /** 阶段配置列表（来自模板），每个阶段含 id、label、icon、sectionIndices 等 */
  phases: PhaseConfig[];
  /** 当前激活的阶段下标 */
  activePhaseIndex: number;
  /** 判断某阶段是否被锁定（前面阶段未完成则锁定） */
  isSectionLocked: (idx: number) => boolean;
  /** 判断某阶段是否为只读（已完成的分析阶段只读不可改） */
  isSectionReadOnly: (idx: number) => boolean;
  /** 点击可进入阶段时的回调（触发阶段切换） */
  onSelect: (idx: number) => void;
  /** 点击被锁定阶段时的回调（用于提示原因） */
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
        // 三种互不冲突的状态：locked（前面没完成，不可点）、readOnly（已完成，只读）、active（当前步骤）
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
