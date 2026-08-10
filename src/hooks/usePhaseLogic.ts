/**
 * 多阶段生命周期逻辑：包装 utils/formValidation 的纯函数，暴露锁定/只读/可完成判定。
 */
import { useMemo } from 'react';
import { format } from 'date-fns';
import type { FormTemplate } from '../types';
import { getCurrentPhaseIndex, isPhaseCompletionSatisfied } from '../utils/formValidation';

export interface PhaseLogic {
  currentPhaseIndex: number;
  isSectionLocked: (phaseIndex: number) => boolean;
  isSectionReadOnly: (phaseIndex: number) => boolean;
  canMarkComplete: (phaseIndex: number) => boolean;
}

export function usePhaseLogic(
  template: FormTemplate,
  values: Record<string, unknown>,
  createdAtISO: string,
): PhaseLogic {
  return useMemo(() => {
    const todayISO = format(new Date(), 'yyyy-MM-dd');
    const context = { todayISO, createdAtISO };
    const phases = template.phases ?? [];
    const currentPhaseIndex = phases.length === 0 ? 0 : getCurrentPhaseIndex(template, values, context);

    const isSectionLocked = (phaseIndex: number): boolean => {
      return phaseIndex > currentPhaseIndex;
    };

    const isSectionReadOnly = (phaseIndex: number): boolean => phaseIndex < currentPhaseIndex;

    const canMarkComplete = (phaseIndex: number): boolean =>
      phaseIndex === currentPhaseIndex &&
      isPhaseCompletionSatisfied(template, phases[phaseIndex], values);

    return { currentPhaseIndex, isSectionLocked, isSectionReadOnly, canMarkComplete };
  }, [template, values, createdAtISO]);
}
