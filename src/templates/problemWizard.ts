/**
 * 问题定义向导（Problem Wizard）：分析任何根因问题之前的第一步。
 * 先走"新建问题"流程把问题本身界定清楚，之后才能挂接具体的分析方法模板。
 *
 * 组成（全部复用 shared.ts 的公共分区工厂）：
 *  ① createProblemDefinitionSection：4W2H 全面分析 + 问题判定/分类 + 目标，
 *     系统自动拼接"标准问题陈述"；
 *  ② createProblemSummarySection：基于分析结果整理出问题标题与一句话陈述；
 *  ③ createBrainstormSection：原因头脑风暴，先穷尽列出 ≥15 个候选原因。
 * 注意：本模板只有 sections、没有 phases —— 它对应"问题实体"的创建，
 * 不参与分析方法那种"阶段式完成度"的判定。
 */
import { createBrainstormSection, createProblemDefinitionSection, createProblemSummarySection } from './shared';
import type { FormTemplate } from '../types';

/**
 * 问题定义向导模板。
 * sections 结构设计意图：先"分析界定问题"（4W2H + 判定 + 分类 + 目标），
 * 再"整理输出"（标题 + 一句话陈述），最后"发散候选原因"（头脑风暴），
 * 三个分区顺序即引导用户从问题到原因的完整路径；
 * 这些数据最终落在独立的 Problem 实体上（problemId 关联到后续分析记录）。
 */
export const problemWizardTemplate: FormTemplate = {
  id: 'problemWizard',
  name: '问题定义',
  icon: '🎯',
  description: '问题实体表单',
  sections: [createProblemDefinitionSection(), createProblemSummarySection(), createBrainstormSection()],
};
