/**
 * 自动补全建议：收集同模板历史记录中 autocomplete=true 字段出现过的值，供输入联想。
 * 核心概念：从"历史数据"里归纳候选值——用户在某个输入框开始打字时，
 * 把这些过去填过的值列出来供选择，避免重复输入。
 */
import type { FormRecord } from '../types';

/**
 * 收集某模板下某字段所有历史填值，去重后按字典序返回，作为输入框的联想建议。
 * @param templateId 目标模板 id（只统计同模板的记录，避免其他模板的值串进来）
 * @param fieldId    要收集联想值的字段 id
 * @param records    用于收集的历史记录全集
 * @returns 去重并排序后的候选字符串数组；没有历史值则返回空数组
 */
export function collectAutocompleteValues(templateId: string, fieldId: string, records: FormRecord[]): string[] {
  // 用 Set 去重：同一值在历史里出现多次只保留一个
  const values = new Set<string>();
  for (const record of records) {
    if (record.templateId !== templateId) continue;
    const raw = record.data[fieldId];
    // 只收集"字符串且去空白后非空"的值，过滤掉空串和无意义的空白
    if (typeof raw === 'string' && raw.trim()) {
      values.add(raw.trim());
    }
  }
  // 转成数组并排序：字典序让候选列表看起来稳定、便于查找
  return Array.from(values).sort();
}
