/**
 * 自动补全建议：收集同模板历史记录中 autocomplete=true 字段出现过的值，供输入联想。
 */
import type { FormRecord } from '../types';

export function collectAutocompleteValues(templateId: string, fieldId: string, records: FormRecord[]): string[] {
  const values = new Set<string>();
  for (const record of records) {
    if (record.templateId !== templateId) continue;
    const raw = record.data[fieldId];
    if (typeof raw === 'string' && raw.trim()) {
      values.add(raw.trim());
    }
  }
  return Array.from(values).sort();
}
