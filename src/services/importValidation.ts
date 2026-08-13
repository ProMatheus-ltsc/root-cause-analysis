/**
 * 导入数据校验：在写入 IndexedDB 之前检查 JSON 结构是否符合预期，避免格式错误或字段缺失
 * 时静默写入脏数据。validateExportedData 返回错误信息列表，空数组表示校验通过。
 * 核心概念：用户上传的 JSON 是不可信的"外部输入"，必须先校验再落库；
 * 校验只做结构/类型检查，不修改任何数据。
 */
import { TEMPLATES } from '../templates';
import type { FormRecord } from '../types';

// 允许的记录状态枚举（表单里只有草稿/已完成两种状态）
const VALID_STATUSES = new Set(['draft', 'completed']);
// 一条记录必须携带的字段清单（缺任何一个都算无效）
const REQUIRED_RECORD_FIELDS: (keyof FormRecord)[] = ['id', 'templateId', 'title', 'data', 'status', 'createdAt', 'updatedAt'];

// 内部工具：判断某个值是否为"普通对象"（排除 null 和数组）。
// 因为 typeof null === 'object' 且 typeof [] === 'object'，需要显式排除
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 校验导入数据（通常是 JSON.parse 的结果），逐条检查记录与问题的结构合法性。
 * 所有问题只收集错误信息、不抛异常，让调用方能一次性看到全部问题。
 * @param data 待校验的导入内容（unknown 是因为它来自 JSON.parse，类型未知）
 * @returns 错误信息字符串数组；长度为 0 表示校验通过、可以安全写入
 */
export function validateExportedData(data: unknown): string[] {
  if (!isPlainObject(data)) {
    return ['文件内容不是有效的 JSON 对象'];
  }

  const errors: string[] = [];

  // ---- 校验 records 数组 ----
  if (!Array.isArray(data.records)) {
    errors.push('缺少 records 数组');
  } else {
    data.records.forEach((record: unknown, idx: number) => {
      const label = `第 ${idx + 1} 条记录`;
      if (!isPlainObject(record)) {
        errors.push(`${label}不是对象`);
        return;
      }
      // 逐字段检查"必需字段是否都存在"（只查键是否在，类型下面再单独查）
      for (const field of REQUIRED_RECORD_FIELDS) {
        if (!(field in record)) {
          errors.push(`${label}缺少字段 ${field}`);
        }
      }
      // 再逐个检查关键字段的类型/取值约束
      if (typeof record.id !== 'string' || !record.id) {
        errors.push(`${label}的 id 不合法`);
      }
      // templateId 必须能对应上已知模板，否则渲染该记录时会找不到表单结构
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

  // ---- 校验可选字段 settings（undefined 视为未提供，允许） ----
  if (data.settings !== undefined && !isPlainObject(data.settings)) {
    errors.push('settings 字段不是对象');
  }

  // ---- 校验可选字段 problems（undefined/null 视为未提供，允许） ----
  if (data.problems !== undefined && data.problems !== null) {
    if (!Array.isArray(data.problems)) {
      errors.push('problems 字段存在但不是数组');
    } else {
      data.problems.forEach((problem: unknown, idx: number) => {
        const label = `第 ${idx + 1} 个问题`;
        if (!isPlainObject(problem)) {
          errors.push(`${label}不是对象`);
          return;
        }
        // 问题实体的必需字段与类型检查（比记录少，因为问题结构更简单）
        if (typeof problem.id !== 'string' || !problem.id) {
          errors.push(`${label}的 id 不合法`);
        }
        if (typeof problem.title !== 'string') {
          errors.push(`${label}的 title 不是字符串`);
        }
        if (!isPlainObject(problem.data)) {
          errors.push(`${label}的 data 不是对象`);
        }
        if (typeof problem.createdAt !== 'string' || typeof problem.updatedAt !== 'string') {
          errors.push(`${label}的 createdAt/updatedAt 不是字符串`);
        }
      });
    }
  }

  return errors;
}
