/**
 * 模板展示元数据：卡片颜色，用于模板选择页与历史记录标签的视觉区分。
 * 核心概念：每个模板固定一套 Tailwind 颜色类（浅色背景 + 同色系文字 + 边框），
 * 让用户在不同页面看到同一模板时颜色一致，形成视觉记忆。
 */
import type { TemplateId } from '../types';

/** 模板 id → Tailwind 颜色类名的映射。新增模板时需在这里补充，否则该模板没有颜色。 */
export const TEMPLATE_COLORS: Record<TemplateId, string> = {
  problemWizard: 'bg-slate-100 text-slate-700 border-slate-200',
  keyFactor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  fiveWhy: 'bg-sky-100 text-sky-700 border-sky-200',
  fishbone: 'bg-teal-100 text-teal-700 border-teal-200',
  timeline: 'bg-amber-100 text-amber-700 border-amber-200',
  comparison: 'bg-violet-100 text-violet-700 border-violet-200',
  systemThinking: 'bg-rose-100 text-rose-700 border-rose-200',
  technicalFault: 'bg-orange-100 text-orange-700 border-orange-200',
  techIncident: 'bg-orange-100 text-orange-700 border-orange-200',
};
