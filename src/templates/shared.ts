/**
 * 多个模板共用的字段常量与分区工厂函数。5Why / 鱼骨图 / 技术故障共享
 * "问题定义" 基础字段与 "根因结论" 分区；所有模板共享 "问题鉴别" 前置区。
 */
import type { FormField, FormSection } from '../types';

export const DISCOVERY_METHOD_OPTIONS = [
  { value: 'active', label: '主动发现' },
  { value: 'passive', label: '被动反馈' },
  { value: 'monitor', label: '监控告警' },
  { value: 'complaint', label: '用户投诉' },
  { value: 'other', label: '其他' },
];

export const IMPACT_SCOPE_OPTIONS = [
  { value: 'personal', label: '个人' },
  { value: 'team', label: '团队' },
  { value: 'department', label: '部门' },
  { value: 'company', label: '公司' },
  { value: 'customer', label: '客户' },
];

export const SEVERITY_OPTIONS = [
  { value: 'P0', label: 'P0 致命' },
  { value: 'P1', label: 'P1 严重' },
  { value: 'P2', label: 'P2 一般' },
  { value: 'P3', label: 'P3 轻微' },
];

export const ROOT_CAUSE_TYPE_OPTIONS = [
  { value: 'process', label: '流程缺陷' },
  { value: 'technical', label: '技术问题' },
  { value: 'human', label: '人为失误' },
  { value: 'design', label: '设计缺陷' },
  { value: 'external', label: '外部因素' },
  { value: 'resource', label: '资源不足' },
  { value: 'communication', label: '沟通问题' },
  { value: 'other', label: '其他' },
];

export function createProblemDefinitionSection(extraFields: FormField[] = []): FormSection {
  return {
    id: 'problemDefinition',
    title: '问题定义',
    fields: [
      { id: 'title', label: '问题标题', type: 'text', required: true },
      {
        id: 'problemStatement',
        label: '一句话问题陈述',
        type: 'textarea',
        required: true,
        hint: '鉴别问题的第一原则：先界定问题，再寻找原因。陈述中不包含原因猜测与解决方案。',
        placeholder: '用一句话客观描述：什么对象、在什么条件下、发生了什么。例如"每日 22:00 批处理任务超时未完成，连续 3 天，影响次日账单生成"',
      },
      { id: 'occurredAt', label: '发生时间', type: 'date', defaultValue: 'auto_today' },
      { id: 'discoveryMethod', label: '发现方式', type: 'radio', options: DISCOVERY_METHOD_OPTIONS },
      { id: 'impactScope', label: '影响范围', type: 'radio', options: IMPACT_SCOPE_OPTIONS },
      { id: 'severity', label: '严重程度', type: 'radio', options: SEVERITY_OPTIONS },
      { id: 'symptom', label: '问题现象描述', type: 'textarea', required: true, placeholder: '补充问题陈述的细节：发生频率、量化数据、关键证据等…' },
      { id: 'expectedState', label: '期望状态描述', type: 'textarea', placeholder: '问题解决后应该呈现的理想状态是什么？' },
      ...extraFields,
    ],
  };
}

/**
 * 问题鉴别区（IS / IS NOT）：根因分析的关键前置环节。
 * 通过"是什么 vs 不是什么"的逐维对比界定问题边界，排除无关因素，
 * 为后续定位根因缩小搜索范围。基于 Kepner-Tregoe 问题分析法的五维鉴别。
 */
export function createProblemIdentificationSection(): FormSection {
  return {
    id: 'problemIdentification',
    title: '问题鉴别（IS / IS NOT）',
    description:
      '用"是什么 vs 不是什么"界定问题边界。每个维度都要同时想清楚"是"与"不是"两面，对比才能暴露关键差异。建议至少完成「对象 / 时间 / 范围」三个维度。',
    collapsedByDefault: true,
    fields: [
      { id: 'isObject', label: '是什么（对象界定）', type: 'textarea', priority: 'recommended', placeholder: '问题具体发生在什么对象 / 系统 / 场景上？' },
      { id: 'isNotObject', label: '不是什么（排除项）', type: 'textarea', priority: 'recommended', placeholder: '哪些相似对象 / 系统 / 场景没有出现该问题？' },
      { id: 'isWhen', label: '何时发生', type: 'textarea', priority: 'recommended', placeholder: '首次何时出现？最近一次？发生频率与时间规律？' },
      { id: 'isNotWhen', label: '何时不发生', type: 'textarea', priority: 'recommended', placeholder: '哪些时间段没有出现该问题？' },
      { id: 'isWhere', label: '何地 / 哪个环节发生', type: 'textarea', priority: 'recommended', placeholder: '在哪个环节 / 地点 / 系统中出现？' },
      { id: 'isNotWhere', label: '何地 / 哪个环节不发生', type: 'textarea', priority: 'recommended', placeholder: '哪些环节 / 地点 / 系统没有出现？' },
      { id: 'isWho', label: '谁受影响', type: 'textarea', priority: 'recommended', placeholder: '哪些用户 / 角色 / 团队受到影响？' },
      { id: 'isNotWho', label: '谁不受影响', type: 'textarea', priority: 'recommended', placeholder: '哪些用户 / 角色 / 团队未受影响？' },
      { id: 'isExtent', label: '影响程度', type: 'textarea', priority: 'recommended', placeholder: '影响多大：数量 / 比例 / 金额 / 趋势？' },
      { id: 'isNotExtent', label: '影响不大的范围', type: 'textarea', priority: 'recommended', placeholder: '哪些范围内影响很小或完全没有？' },
      {
        id: 'factCheck',
        label: '描述自检',
        type: 'checkbox',
        options: [
          { value: 'noAssumption', label: '以上描述均为已发生的事实，不含原因猜测' },
          { value: 'verifiable', label: '每条描述都有可验证的依据（数据/日志/观察）' },
          { value: 'noSolutionJump', label: '没有把"解决方案"或"想要的结果"当作"问题定义"' },
        ],
      },
    ],
  };
}

export function createRemedySection(): FormSection {
  return {
    id: 'remedy',
    title: '根因结论',
    fields: [
      { id: 'rootCauseSummary', label: '根因总结', type: 'textarea', required: true, placeholder: '用一句话概括最终确定的根本原因' },
      { id: 'rootCauseType', label: '根因类型分类', type: 'radio', options: ROOT_CAUSE_TYPE_OPTIONS },
    ],
  };
}
