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
import { techIncidentTemplate } from './techIncident';

export const TEMPLATES: Record<TemplateId, FormTemplate> = {
  problemWizard: problemWizardTemplate,
  keyFactor: keyFactorTemplate,
  fiveWhy: fiveWhyTemplate,
  fishbone: fishboneTemplate,
  timeline: timelineTemplate,
  comparison: comparisonTemplate,
  systemThinking: systemThinkingTemplate,
  technicalFault: technicalFaultTemplate,
  techIncident: techIncidentTemplate,
};

/**
 * 分析方法模板列表（不含 problemWizard）。
 * 时间线分析（timeline）与技术故障根因分析（technicalFault）已二合一为"技术专题分析"（techIncident），
 * 旧模板保留在 TEMPLATES 中以兼容历史数据的打开/导出，但不再出现在新增入口。
 */
const HIDDEN_FROM_LIST: TemplateId[] = ['timeline', 'technicalFault'];
export const TEMPLATE_LIST: FormTemplate[] = Object.values(TEMPLATES).filter((t) => t.id !== 'problemWizard' && !HIDDEN_FROM_LIST.includes(t.id));

export function getTemplate(templateId: TemplateId): FormTemplate {
  return TEMPLATES[templateId];
}
