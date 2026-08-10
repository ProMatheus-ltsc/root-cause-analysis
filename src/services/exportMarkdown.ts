/**
 * 将分析记录按模板结构渲染为 Markdown 文本，用于导出下载。exportRecordToMarkdown
 * 导出单条记录；exportRecordsToMarkdown 把多条记录（如历史页当前筛选结果）拼成一份汇总文档。
 */
import type { FormField, FormRecord, FormSection, FormTemplate, TemplateId } from '../types';
import { isEmptyValue } from '../utils/formValidation';

function optionLabel(field: FormField, value: unknown): string {
  if (!field.options) return String(value);
  if (Array.isArray(value)) {
    return value.map((v) => field.options!.find((o) => o.value === v)?.label ?? String(v)).join('、');
  }
  return field.options.find((o) => o.value === value)?.label ?? String(value);
}

function renderTable(field: FormField, rows: Record<string, unknown>[]): string {
  const columns = field.tableColumns ?? [];
  if (columns.length === 0 || rows.length === 0) return '';
  const header = `| ${columns.map((c) => c.label).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${columns.map((c) => String(row[c.id] ?? '')).join(' | ')} |`).join('\n');
  return `\n\n${header}\n${divider}\n${body}`;
}

function renderFieldValue(field: FormField, value: unknown): string {
  if (isEmptyValue(value)) return '';
  if (field.type === 'checkbox' && !field.options) {
    return value ? '是' : '否';
  }
  if (field.type === 'radio' || field.type === 'select' || (field.type === 'checkbox' && field.options)) {
    return optionLabel(field, value);
  }
  if (field.type === 'table' && Array.isArray(value)) {
    return renderTable(field, value as Record<string, unknown>[]);
  }
  return String(value);
}

function renderSection(section: FormSection, data: Record<string, unknown>): string {
  const lines: string[] = [];
  if (section.repeatable) {
    const entries = (data[section.id] as Record<string, unknown>[] | undefined) ?? [];
    if (entries.length === 0) return '';
    lines.push(`## ${section.title}`);
    entries.forEach((entry, idx) => {
      lines.push(`\n### ${(section.repeatLabel ?? '{n}').replace('{n}', String(idx + 1))}`);
      for (const field of section.fields) {
        const rendered = renderFieldValue(field, entry[field.id]);
        if (rendered) lines.push(`- **${field.label}**：${rendered}`);
      }
    });
    return lines.join('\n');
  }
  const fieldLines: string[] = [];
  for (const field of section.fields) {
    const rendered = renderFieldValue(field, data[field.id]);
    if (rendered) fieldLines.push(`- **${field.label}**：${rendered}`);
  }
  if (fieldLines.length === 0) return '';
  lines.push(`## ${section.title}`, ...fieldLines);
  return lines.join('\n');
}

export function exportRecordToMarkdown(template: FormTemplate, record: FormRecord): string {
  const parts: string[] = [
    `# ${record.title || template.name}`,
    '',
    `模板：${template.name}　|　创建时间：${record.createdAt}　|　更新时间：${record.updatedAt}`,
  ];
  for (const section of template.sections) {
    const rendered = renderSection(section, record.data);
    if (rendered) parts.push('', rendered);
  }
  return parts.join('\n');
}

export function exportRecordsToMarkdown(templates: Record<TemplateId, FormTemplate>, records: FormRecord[]): string {
  return records.map((record) => exportRecordToMarkdown(templates[record.templateId], record)).join('\n\n---\n\n');
}
