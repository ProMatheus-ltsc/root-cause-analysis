/**
 * 模板注册表：统一导出全部分析方法模板，供表单引擎与页面按 templateId 查找。
 * 顺序：要因分析法（推荐）置顶，其他方法作为可选项。
 */
import type { FormTemplate, TemplateId } from '../types';
import { problemWizardTemplate } from './problemWizard';
import { keyFactorTemplate } from './keyFactor';
import { fiveWhyTemplate } from './fiveWhy';
import { fishboneTemplate } from './fishbone';
import { timelineTemplate } from './timeline';
import { comparisonTemplate } from './comparison';
import { systemThinkingTemplate } from './systemThinking';
import { technicalFaultTemplate } from './technicalFault';

export const TEMPLATES: Record<TemplateId, FormTemplate> = {
  problemWizard: problemWizardTemplate,
  keyFactor: keyFactorTemplate,
  fiveWhy: fiveWhyTemplate,
  fishbone: fishboneTemplate,
  timeline: timelineTemplate,
  comparison: comparisonTemplate,
  systemThinking: systemThinkingTemplate,
  technicalFault: technicalFaultTemplate,
};

/** 分析方法模板列表（不含 problemWizard），推荐模板优先展示。 */
export const TEMPLATE_LIST: FormTemplate[] = Object.values(TEMPLATES).filter((t) => t.id !== 'problemWizard');

export function getTemplate(templateId: TemplateId): FormTemplate {
  return TEMPLATES[templateId];
}
