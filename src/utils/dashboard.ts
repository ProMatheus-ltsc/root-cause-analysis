/**
 * 仪表盘统计纯函数：状态分组、根因类型分布、经验教训高频词、逾期对策与最近记录。
 * 全部以传入的 todayISO 作为"现在"，不在函数内部读取系统时间。
 */
import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { FormRecord, FormTemplate, TemplateId } from '../types';
import { ROOT_CAUSE_TYPE_OPTIONS } from '../templates/shared';
import { getCurrentPhaseIndex, type PhaseLockContext } from './formValidation';

export type DisplayStatus = '待分析' | '分析中' | '已关闭';

function recordContext(record: FormRecord, todayISO: string): PhaseLockContext {
  return { todayISO, createdAtISO: record.createdAt };
}

export function getDisplayStatus(template: FormTemplate, record: FormRecord, todayISO: string): DisplayStatus {
  const phases = template.phases;
  const context = recordContext(record, todayISO);
  if (!phases || phases.length === 0) {
    return record.status === 'completed' ? '已关闭' : '待分析';
  }
  if (record.status === 'completed') {
    return '已关闭';
  }
  const currentIdx = getCurrentPhaseIndex(template, record.data, context);
  return currentIdx === 0 ? '待分析' : '分析中';
}

export function countByDisplayStatus(
  records: FormRecord[],
  templates: Record<TemplateId, FormTemplate>,
  todayISO: string,
): Record<DisplayStatus, number> {
  const counts: Record<DisplayStatus, number> = { 待分析: 0, 分析中: 0, 已关闭: 0 };
  for (const record of records) {
    const status = getDisplayStatus(templates[record.templateId], record, todayISO);
    counts[status] += 1;
  }
  return counts;
}

export interface RootCauseTypeCount {
  type: string;
  label: string;
  count: number;
}

export function rootCauseTypeDistribution(records: FormRecord[]): RootCauseTypeCount[] {
  const counts = new Map<string, number>();
  for (const record of records) {
    const value = record.data['rootCauseType'];
    if (typeof value === 'string' && value) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return ROOT_CAUSE_TYPE_OPTIONS.map((opt) => ({ type: opt.value, label: opt.label, count: counts.get(opt.value) ?? 0 })).filter(
    (c) => c.count > 0,
  );
}

const STOPWORDS = new Set(['的', '了', '是', '在', '和', '也', '就', '都', '而', '及', '与', '这', '那', '我们', '因为', '所以']);

/** 简单的中英文分词近似：按标点/空白切分，过滤停用词与单字，统计出现频次取前 topN。 */
export function extractTopKeywords(records: FormRecord[], topN = 10): { keyword: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const record of records) {
    const text = record.data['lessonsLearned'];
    if (typeof text !== 'string' || !text) continue;
    const tokens = text
      .split(/[，。！？；、\s,.!?;:"'""''()（）[\]【】\n\r]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
    for (const token of tokens) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

export function recentRecords(records: FormRecord[], limit = 5): FormRecord[] {
  return [...records].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit);
}

/** 距离上次导出备份已过去多少天；从未导出过时返回 undefined。 */
export function daysSinceLastExport(lastExportedAt: string | undefined, todayISO: string): number | undefined {
  if (!lastExportedAt) return undefined;
  return Math.max(0, differenceInCalendarDays(parseISO(todayISO), parseISO(lastExportedAt.slice(0, 10))));
}
