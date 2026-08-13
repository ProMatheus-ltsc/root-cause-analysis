/**
 * 将分析记录按模板结构渲染为 Markdown 文本，用于导出下载。exportRecordToMarkdown
 * 导出单条记录；exportRecordsToMarkdown 把多条记录（如历史页当前筛选结果）拼成一份汇总文档。
 * 渲染思路：字段值先经 isEmptyValue 判定为空则跳过，非空值按字段类型转换为可读的 Markdown 文本。
 */
import type { FormField, FormRecord, FormSection, FormTemplate, TemplateId } from '../types';
import { isEmptyValue } from '../utils/formValidation';

// 内部辅助：把字段的"存储值"翻译成"展示文案"。
// select/radio 等字段存的是 option 的 value，这里通过 options 反查出用户看到的 label
function optionLabel(field: FormField, value: unknown): string {
  if (!field.options) return String(value);
  // 多选（checkbox/多值）时 value 是数组：每个元素都转成 label，再用"、"连接
  if (Array.isArray(value)) {
    return value.map((v) => field.options!.find((o) => o.value === v)?.label ?? String(v)).join('、');
  }
  // 单选时直接查 label；找不到匹配的 option 就原样转字符串兜底
  return field.options.find((o) => o.value === value)?.label ?? String(value);
}

// 内部辅助：把 table 类型字段的多行数据渲染成 Markdown 表格。
// 空表或没有列定义时返回空串（调用方据此决定要不要渲染这个字段）
function renderTable(field: FormField, rows: Record<string, unknown>[]): string {
  const columns = field.tableColumns ?? [];
  if (columns.length === 0 || rows.length === 0) return '';
  const header = `| ${columns.map((c) => c.label).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  // 每行数据按列顺序取值，缺失的单元格用空串占位；行之间用换行分隔
  const body = rows.map((row) => `| ${columns.map((c) => String(row[c.id] ?? '')).join(' | ')} |`).join('\n');
  return `\n\n${header}\n${divider}\n${body}`;
}

// 内部辅助：按字段类型决定如何把 value 渲染成 Markdown 片段（返回 '' 表示该字段应被跳过）
function renderFieldValue(field: FormField, value: unknown): string {
  if (isEmptyValue(value)) return '';
  // 无选项的 checkbox 本质是"是/否"开关：true 显示"是"，false 显示"否"
  if (field.type === 'checkbox' && !field.options) {
    return value ? '是' : '否';
  }
  // 单选类字段统一走 optionLabel：radio、select，以及"有选项的 checkbox"（多选）
  if (field.type === 'radio' || field.type === 'select' || (field.type === 'checkbox' && field.options)) {
    return optionLabel(field, value);
  }
  // table 字段渲染成 Markdown 表格
  if (field.type === 'table' && Array.isArray(value)) {
    return renderTable(field, value as Record<string, unknown>[]);
  }
  // 其余文本/数字/日期等一律按字符串输出
  return String(value);
}

// 内部辅助：渲染一个分区的全部内容（"## 分区标题" + 其下各字段），返回完整 Markdown 文本
function renderSection(section: FormSection, data: Record<string, unknown>): string {
  const lines: string[] = [];
  if (section.repeatable) {
    // 可重复分区：data[section.id] 里存的是"条目的数组"，每条渲染成一个三级标题块
    const entries = (data[section.id] as Record<string, unknown>[] | undefined) ?? [];
    if (entries.length === 0) return '';
    lines.push(`## ${section.title}`);
    entries.forEach((entry, idx) => {
      // repeatLabel 是条目标题模板（如"第 {n} 次追问"），把 {n} 替换成从 1 开始的序号
      lines.push(`\n### ${(section.repeatLabel ?? '{n}').replace('{n}', String(idx + 1))}`);
      for (const field of section.fields) {
        const rendered = renderFieldValue(field, entry[field.id]);
        if (rendered) lines.push(`- **${field.label}**：${rendered}`);
      }
    });
    return lines.join('\n');
  }
  // 普通分区：逐个字段渲染，全部为空则整个分区不输出
  const fieldLines: string[] = [];
  for (const field of section.fields) {
    const rendered = renderFieldValue(field, data[field.id]);
    if (rendered) fieldLines.push(`- **${field.label}**：${rendered}`);
  }
  if (fieldLines.length === 0) return '';
  lines.push(`## ${section.title}`, ...fieldLines);
  return lines.join('\n');
}

/**
 * 把单条记录渲染成一份完整的 Markdown 文档（标题 + 元信息 + 各分区）。
 * @param template 记录所属模板，提供分区结构与模板名
 * @param record   要导出的记录（数据在 record.data 中）
 * @returns 可直接写入 .md 文件的文本内容
 */
export function exportRecordToMarkdown(template: FormTemplate, record: FormRecord): string {
  // 文档头部：标题用记录标题，没有则退回模板名；第二行附上模板名与创建/更新时间
  const parts: string[] = [
    `# ${record.title || template.name}`,
    '',
    `模板：${template.name}　|　创建时间：${record.createdAt}　|　更新时间：${record.updatedAt}`,
  ];
  for (const section of template.sections) {
    const rendered = renderSection(section, record.data);
    // 分区为空时跳过，避免文档里出现孤零零的空标题
    if (rendered) parts.push('', rendered);
  }
  return parts.join('\n');
}

/**
 * 把多条记录拼成一份汇总 Markdown 文档（每条记录之间用"---"分隔线隔开）。
 * @param templates 模板字典（按 templateId 索引，供每条记录找到自己的模板）
 * @param records   要导出的记录列表（通常是历史页当前筛选后的结果）
 * @returns 合并后的完整 Markdown 文本
 */
export function exportRecordsToMarkdown(templates: Record<TemplateId, FormTemplate>, records: FormRecord[]): string {
  return records.map((record) => exportRecordToMarkdown(templates[record.templateId], record)).join('\n\n---\n\n');
}
