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
 * 可作为"问题下新增分析方法"的模板列表（不含 problemWizard）。
 * - timeline / technicalFault：已二合一为 techIncident，不再出现在新增入口（保留注册以兼容历史数据打开/导出）
 * - techIncident（技术专题）：仅通过首页独立入口创建（不走新建问题流程），不作为问题下的分析方法
 */
const HIDDEN_FROM_LIST: TemplateId[] = ['timeline', 'technicalFault', 'techIncident'];
export const TEMPLATE_LIST: FormTemplate[] = Object.values(TEMPLATES).filter((t) => t.id !== 'problemWizard' && !HIDDEN_FROM_LIST.includes(t.id));

/**
 * 全部分析方法列表（仅排除 problemWizard）：用于历史记录筛选等需要看到所有模板的场景。
 * 与技术专题由首页独立创建但历史记录仍需按模板筛选。
 */
export const ALL_TEMPLATE_LIST: FormTemplate[] = Object.values(TEMPLATES).filter((t) => t.id !== 'problemWizard');

export function getTemplate(templateId: TemplateId): FormTemplate {
  return TEMPLATES[templateId];
}
