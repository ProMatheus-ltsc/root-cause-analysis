/**
 * 导入数据校验：在写入 IndexedDB 之前检查 JSON 结构是否符合预期，避免格式错误或字段缺失
 * 时静默写入脏数据。validateExportedData 返回错误信息列表，空数组表示校验通过。
 */
import { TEMPLATES } from '../templates';
import type { FormRecord } from '../types';

const VALID_STATUSES = new Set(['draft', 'completed']);
const REQUIRED_RECORD_FIELDS: (keyof FormRecord)[] = ['id', 'templateId', 'title', 'data', 'status', 'createdAt', 'updatedAt'];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateExportedData(data: unknown): string[] {
  if (!isPlainObject(data)) {
    return ['文件内容不是有效的 JSON 对象'];
  }

  const errors: string[] = [];

  if (!Array.isArray(data.records)) {
    errors.push('缺少 records 数组');
  } else {
    data.records.forEach((record: unknown, idx: number) => {
      const label = `第 ${idx + 1} 条记录`;
      if (!isPlainObject(record)) {
        errors.push(`${label}不是对象`);
        return;
      }
      for (const field of REQUIRED_RECORD_FIELDS) {
        if (!(field in record)) {
          errors.push(`${label}缺少字段 ${field}`);
        }
      }
      if (typeof record.id !== 'string' || !record.id) {
        errors.push(`${label}的 id 不合法`);
      }
      if (typeof record.templateId !== 'string' || !(record.templateId in TEMPLATES)) {
        errors.push(`${label}的 templateId「${String(record.templateId)}」不是已知模板`);
      }
      if (typeof record.title !== 'string') {
        errors.push(`${label}的 title 不是字符串`);
      }
      if (!isPlainObject(record.data)) {
        errors.push(`${label}的 data 不是对象`);
      }
      if (typeof record.status !== 'string' || !VALID_STATUSES.has(record.status)) {
        errors.push(`${label}的 status 不合法`);
      }
      if (typeof record.createdAt !== 'string' || typeof record.updatedAt !== 'string') {
        errors.push(`${label}的 createdAt/updatedAt 不是字符串`);
      }
    });
  }

  if (data.settings !== undefined && !isPlainObject(data.settings)) {
    errors.push('settings 字段不是对象');
  }

  return errors;
}
