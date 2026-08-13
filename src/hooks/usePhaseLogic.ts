/**
 * 多阶段生命周期逻辑：包装 utils/formValidation 的纯函数，暴露锁定/只读/可完成判定。
 *
 * 扮演的角色：为"分阶段表单"提供阶段状态判断。根因分析流程被拆成多个阶段（phase），
 * 本 hook 根据当前日期与表单填写情况算出：
 *   - 当前应该处于哪个阶段（currentPhaseIndex）
 *   - 哪些阶段被锁定（未来阶段，不能编辑）
 *   - 哪些阶段只读（过去阶段，只能看不能改）
 *   - 当前阶段能否标记为完成（是否满足必填校验）
 * 核心概念：时间驱动的阶段流转——createdAt 是起点，"今天"是当前指针，
 * 每个阶段按时间窗口推进，过去只读、现在可填、未来锁定。
 */
import { useMemo } from 'react';
import { format } from 'date-fns';
import type { FormTemplate } from '../types';
import { getCurrentPhaseIndex, isPhaseCompletionSatisfied } from '../utils/formValidation';

/** 阶段判定逻辑的返回值：供表单组件使用的四个判定结果 */
export interface PhaseLogic {
  /** 当前所处的阶段下标（0 开始）；没有阶段定义时为 0 */
  currentPhaseIndex: number;
  /** 该阶段是否被锁定（未来阶段）：锁定则不能编辑 */
  isSectionLocked: (phaseIndex: number) => boolean;
  /** 该阶段是否只读（过去阶段）：只读则只能查看不能修改 */
  isSectionReadOnly: (phaseIndex: number) => boolean;
  /** 该阶段当前能否标记为"完成"：需要正好处于当前阶段且校验通过 */
  canMarkComplete: (phaseIndex: number) => boolean;
}

/**
 * 计算多阶段表单的阶段状态。
 * @param template 表单模板（含阶段 phases 定义）
 * @param values 当前表单的全部字段值
 * @param createdAtISO 记录创建时间（阶段时间窗的起点）
 * @returns PhaseLogic 阶段判定结果
 *
 * 整体包在 useMemo 里：只有当 template、values、createdAtISO 真正变化时才重新计算，
 * 避免每次输入一个字符都重跑一遍阶段判断。
 */
export function usePhaseLogic(
  template: FormTemplate,
  values: Record<string, unknown>,
  createdAtISO: string,
): PhaseLogic {
  return useMemo(() => {
    // 生成"今天"的日期字符串，作为阶段判定的时间基准（与创建时间对比）
    const todayISO = format(new Date(), 'yyyy-MM-dd');
    // 传给校验工具函数的上下文：当前日期 + 创建日期
    const context = { todayISO, createdAtISO };
    // 模板可能未定义阶段，缺省为空数组
    const phases = template.phases ?? [];
    // 阶段数量为 0 时，统一当作"只有一个阶段"处理（currentPhaseIndex = 0）
    const currentPhaseIndex = phases.length === 0 ? 0 : getCurrentPhaseIndex(template, values, context);

    // 未来阶段（下标大于当前阶段）锁定，禁止编辑
    const isSectionLocked = (phaseIndex: number): boolean => {
      return phaseIndex > currentPhaseIndex;
    };

    // 过去阶段（下标小于当前阶段）只读，防止追溯修改已完成的内容
    const isSectionReadOnly = (phaseIndex: number): boolean => phaseIndex < currentPhaseIndex;

    // 只有"正好处于当前阶段"且"该阶段的必填校验通过"时，才允许标记完成
    const canMarkComplete = (phaseIndex: number): boolean =>
      phaseIndex === currentPhaseIndex &&
      isPhaseCompletionSatisfied(template, phases[phaseIndex], values);

    return { currentPhaseIndex, isSectionLocked, isSectionReadOnly, canMarkComplete };
  }, [template, values, createdAtISO]);
}
