/**
 * 仪表盘统计纯函数：状态分组、根因类型分布、经验教训高频词、逾期对策与最近记录。
 * 全部以传入的 todayISO 作为"现在"，不在函数内部读取系统时间。
 * 本文件只负责"计算"，不负责"取数"：记录与模板由调用方从数据层取好传入，
 * 好处是每个函数都不依赖外部状态、便于单独测试和复用。
 */
import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { FormRecord, FormTemplate, TemplateId } from '../types';
import { ROOT_CAUSE_TYPE_OPTIONS } from '../templates/shared';
import { getCurrentPhaseIndex, type PhaseLockContext } from './formValidation';

/** 记录的展示状态：待分析（第一阶段）→ 分析中（后续阶段）→ 已完成（completed）。 */
export type DisplayStatus = '待分析' | '分析中' | '已完成';

// 内部辅助函数：把"记录 + 今天的日期"拼装成阶段进度判定所需的上下文对象。
// getCurrentPhaseIndex 需要同时知道"现在"和记录的创建时间，才能判断当前落在哪个阶段。
function recordContext(record: FormRecord, todayISO: string): PhaseLockContext {
  return { todayISO, createdAtISO: record.createdAt };
}

/**
 * 计算单条记录当前应展示的状态（待分析 / 分析中 / 已完成），仪表盘与列表页共用。
 * 判断优先级：已完成 > 无阶段模板时看 status 字段 > 当前所处阶段是否是第一阶段。
 * @param template 记录对应的模板（决定阶段如何划分）
 * @param record   要判断状态的记录
 * @param todayISO 以 yyyy-MM-dd 字符串表示的"今天"，由调用方传入，保证函数不读取系统时钟
 * @returns 展示状态字符串
 */
export function getDisplayStatus(template: FormTemplate, record: FormRecord, todayISO: string): DisplayStatus {
  const phases = template.phases;
  const context = recordContext(record, todayISO);
  // 模板没有阶段配置时，退化为只用 status 字段判断：completed 即已完成，否则待分析
  if (!phases || phases.length === 0) {
    return record.status === 'completed' ? '已完成' : '待分析';
  }
  if (record.status === 'completed') {
    return '已完成';
  }
  const currentIdx = getCurrentPhaseIndex(template, record.data, context);
  // 仍处于第一个阶段 = 还没开始实质推进，展示为"待分析"；否则视为"分析中"
  return currentIdx === 0 ? '待分析' : '分析中';
}

/**
 * 统计一批记录中各种展示状态的数量，供仪表盘的图表展示。
 * @param records   全部记录
 * @param templates 模板字典（按 templateId 索引，用于给每条记录找到对应的模板）
 * @param todayISO  今天的日期字符串，作为判定"现在"的统一基准
 * @returns 形如 { 待分析: 2, 分析中: 5, 已完成: 3 } 的计数对象
 */
export function countByDisplayStatus(
  records: FormRecord[],
  templates: Record<TemplateId, FormTemplate>,
  todayISO: string,
): Record<DisplayStatus, number> {
  // 先给三种状态都初始化成 0，避免出现 undefined 参与加法导致 NaN
  const counts: Record<DisplayStatus, number> = { 待分析: 0, 分析中: 0, 已完成: 0 };
  for (const record of records) {
    const status = getDisplayStatus(templates[record.templateId], record, todayISO);
    counts[status] += 1;
  }
  return counts;
}

/** 根因类型分布的单项统计：type 是存储值，label 是展示文案，count 是出现次数。 */
export interface RootCauseTypeCount {
  type: string;
  label: string;
  count: number;
}

/**
 * 统计各根因类型在记录中的出现次数，按模板预定义的类型选项顺序返回。
 * 只返回出现次数大于 0 的类型，避免图表中出现一长串全 0 的空行。
 * @param records 全部记录
 * @returns 形如 [{ type, label, count }] 的数组，仅含 count > 0 的项
 */
export function rootCauseTypeDistribution(records: FormRecord[]): RootCauseTypeCount[] {
  const counts = new Map<string, number>();
  for (const record of records) {
    const value = record.data['rootCauseType'];
    // 只有字符串且非空的取值才参与统计（用户可能没填，或数据里混入了其他类型）
    if (typeof value === 'string' && value) {
      // ?? 0 表示"取不到就当作 0"：第一次遇到某类型时从 0 开始累加
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  // 按 ROOT_CAUSE_TYPE_OPTIONS 的顺序映射，保证图表中类型的排列是固定的；
  // 末尾 .filter 去掉没出现过的类型，避免出现 count 全为 0 的占位项
  return ROOT_CAUSE_TYPE_OPTIONS.map((opt) => ({ type: opt.value, label: opt.label, count: counts.get(opt.value) ?? 0 })).filter(
    (c) => c.count > 0,
  );
}

// 停用词表：中文高频虚词/连接词。分词后要剔除它们，因为对"经验教训"的语义几乎无贡献，
// 保留只会污染高频词的统计结果。用 Set 是为了后面用 has() 判断时接近 O(1)。
const STOPWORDS = new Set(['的', '了', '是', '在', '和', '也', '就', '都', '而', '及', '与', '这', '那', '我们', '因为', '所以']);

/** 简单的中英文分词近似：按标点/空白切分，过滤停用词与单字，统计出现频次取前 topN。 */
export function extractTopKeywords(records: FormRecord[], topN = 10): { keyword: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const record of records) {
    const text = record.data['lessonsLearned'];
    if (typeof text !== 'string' || !text) continue;
    // 近似分词：用正则按"中英文标点 + 空白 + 换行"把长句切成一串片段。
    // 这是最简单的中文"分词"方式（真正的中文分词需要词库，这里不引入额外依赖）。
    const tokens = text
      .split(/[，。！？；、\s,.!?;:"'""''()（）[\]【】\n\r]+/)
      .map((t) => t.trim())
      // 过滤规则：长度小于 2 的多为单字/残留符号，无统计意义；停用词表中的词直接丢弃
      .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
    for (const token of tokens) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }
  // 把 Map 转成 [{keyword, count}] 数组后，按次数降序排序，再截取前 topN 个作为高频词
  return Array.from(counts.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

/**
 * 按更新时间倒序取最近 limit 条记录，用于仪表盘"最近记录"列表。
 * @param records 全部记录
 * @param limit   最多返回的条数（默认 5）
 * @returns 按 updatedAt 从新到旧排序后截取的记录数组
 */
export function recentRecords(records: FormRecord[], limit = 5): FormRecord[] {
  // 先 [...records] 复制一份再排序：Array.prototype.sort 会原地修改数组，
  // 复制排序后不会污染调用方持有的原数组（不可变更新的习惯写法）
  return [...records].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit);
}

/** 距离上次导出备份已过去多少天；从未导出过时返回 undefined。 */
export function daysSinceLastExport(lastExportedAt: string | undefined, todayISO: string): number | undefined {
  if (!lastExportedAt) return undefined;
  // slice(0, 10) 只截取日期部分（yyyy-MM-dd），避免 ISO 时间戳里的"几点几分"干扰"差几天"的直觉；
  // Math.max(0, ...) 防止两端的时钟/时区差异算出负数（比如今天早上 1 点、上次导出在昨天 23 点）
  return Math.max(0, differenceInCalendarDays(parseISO(todayISO), parseISO(lastExportedAt.slice(0, 10))));
}
