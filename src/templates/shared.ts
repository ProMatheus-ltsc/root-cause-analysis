/**
 * 多个模板共用的字段常量与分区工厂函数。5Why 与鱼骨图共享完全相同的
 * "问题定义" 基础字段与 "根因结论" 分区。
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
      { id: 'occurredAt', label: '发生时间', type: 'date', defaultValue: 'auto_today' },
      { id: 'discoveryMethod', label: '发现方式', type: 'radio', options: DISCOVERY_METHOD_OPTIONS },
      { id: 'impactScope', label: '影响范围', type: 'radio', options: IMPACT_SCOPE_OPTIONS },
      { id: 'severity', label: '严重程度', type: 'radio', options: SEVERITY_OPTIONS },
      { id: 'symptom', label: '问题现象描述', type: 'textarea', required: true, placeholder: '描述观察到的具体现象，包括发生频率、影响范围和严重程度…' },
      { id: 'expectedState', label: '期望状态描述', type: 'textarea', placeholder: '问题解决后应该呈现的理想状态是什么？' },
      ...extraFields,
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
