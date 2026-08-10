/**
 * 模板展示元数据：卡片颜色，用于模板选择页与历史记录标签的视觉区分。
 */
import type { TemplateId } from '../types';

export const TEMPLATE_COLORS: Record<TemplateId, string> = {
  fiveWhy: 'bg-sky-100 text-sky-700 border-sky-200',
  fishbone: 'bg-teal-100 text-teal-700 border-teal-200',
  timeline: 'bg-amber-100 text-amber-700 border-amber-200',
  comparison: 'bg-violet-100 text-violet-700 border-violet-200',
  systemThinking: 'bg-rose-100 text-rose-700 border-rose-200',
  technicalFault: 'bg-orange-100 text-orange-700 border-orange-200',
};
