/**
 * 模板注册表：统一导出全部分析方法模板，供表单引擎与页面按 templateId 查找。
 * 顺序：要因分析法（推荐）置顶，其他方法作为可选项。
 *
 * 导出说明：
 * - TEMPLATES：id → 模板 的完整映射（含 problemWizard 问题定义向导）；
 * - TEMPLATE_LIST：可作为"问题下新增分析方法"的候选列表（不含向导与隐藏模板）；
 * - ALL_TEMPLATE_LIST：全部模板（仅排除向导），供历史记录筛选等场景；
 * - getTemplate(templateId)：按 id 取模板的工具函数。
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

/**
 * 模板注册表：TemplateId → 模板对象 的映射。
 * 表单引擎根据模板 id 查找对应配置来渲染表单；
 * 新增模板时必须在这里登记，同时补充上面的 import。
 */
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

/**
 * 按 templateId 取模板对象。
 * @param templateId 模板唯一标识（如 'fishbone'、'fiveWhy'）
 * @returns 对应的 FormTemplate 配置；id 不存在时返回 undefined，调用方需自行兜底
 */
export function getTemplate(templateId: TemplateId): FormTemplate {
  return TEMPLATES[templateId];
}
