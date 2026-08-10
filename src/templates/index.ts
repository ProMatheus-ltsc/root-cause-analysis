/**
 * 模板注册表：统一导出全部分析方法模板，供表单引擎与页面按 templateId 查找。
 */
import type { FormTemplate, TemplateId } from '../types';
import { fiveWhyTemplate } from './fiveWhy';
import { fishboneTemplate } from './fishbone';
import { timelineTemplate } from './timeline';
import { comparisonTemplate } from './comparison';
import { systemThinkingTemplate } from './systemThinking';
import { technicalFaultTemplate } from './technicalFault';

export const TEMPLATES: Record<TemplateId, FormTemplate> = {
  fiveWhy: fiveWhyTemplate,
  fishbone: fishboneTemplate,
  timeline: timelineTemplate,
  comparison: comparisonTemplate,
  systemThinking: systemThinkingTemplate,
  technicalFault: technicalFaultTemplate,
};

export const TEMPLATE_LIST: FormTemplate[] = Object.values(TEMPLATES);

export function getTemplate(templateId: TemplateId): FormTemplate {
  return TEMPLATES[templateId];
}
