/**
 * 表单引擎核心纯函数（部分已下沉到 @shared/core）
 *
 * 已下沉：isEmptyValue（直接复用公共包实现，语义一致）
 *
 * 保留本地（与本项目数据/调用契约绑定）：
 * - isCompletionFieldSatisfied / isPhaseCompletionSatisfied：基座版通过
 *   readRepeatableEntries 读取 `_entries`/`_repeat_` 前缀键，而本项目重复段
 *   直接以 section.id 为键（如 values.whyChain），复用会读不到条目。
 * - resolveDefaultValue(field, existingValue, todayISO, nowISO)：基座版签名为
 *   resolveDefaultValue(defaultValue)，本项目需要"传入字段与现值"的形态。
 * - getCurrentPhaseIndex(template, values, context)：基座版接收 phases 数组，
 *   本项目按 template + PhaseLockContext 调用（dashboard/usePhaseLogic 依赖）。
 * - validateRequiredFields(...)：基座版返回 { valid, errors, missingFields }，
 *   本项目消费方期望 MissingField[]（直接 .map(m => m.label)）。
 */
import { addDays, format, parseISO } from 'date-fns';
import type { FormField, FormSection, FormTemplate, PhaseConfig } from '../types';

import { isEmptyValue as isEmptyValueFromBase } from '@shared/core/utils/formValidation';

export const isEmptyValue = isEmptyValueFromBase;

// 本地别名：供下方保留函数内部调用
const isEmptyValueLocal = isEmptyValue;

// 说明：isCompletionFieldSatisfied / isPhaseCompletionSatisfied 保留本地实现。
// 基座版通过 readRepeatableEntries 读取 `_entries`/`_repeat_` 前缀键，
// 而本项目重复段数据直接以 section.id 为键（如 values.whyChain），
// 直接复用会读不到条目导致阶段判定回归（已由 formValidation.test 覆盖）。

/** 查找字段所属 section。 */
function findFieldSection(template: FormTemplate, fieldId: string): { section: FormSection; index: number } | undefined {
  for (let index = 0; index < template.sections.length; index++) {
    const section = template.sections[index];
    if (section.fields.some((f) => f.id === fieldId)) {
      return { section, index };
    }
  }
  return undefined;
}

/** 判断 table 类型字段是否有实际内容（至少有一个非零/非空值）。 */
function isTableFieldFilled(value: unknown): boolean {
  if (!Array.isArray(value) || value.length === 0) return false;
  return value.some((row) => {
    if (typeof row !== 'object' || row === null) return false;
    return Object.values(row as Record<string, unknown>).some((cell) => {
      if (typeof cell === 'number') return cell !== 0;
      if (typeof cell === 'string') return cell.trim() !== '';
      return cell !== undefined && cell !== null;
    });
  });
}

/** 判断某个 completionFields 中列出的字段 id 在当前数据下是否已满足（非重复段=非空；重复段=至少 minEntries 条目该字段非空；table=至少有一个非零值）。 */
export function isCompletionFieldSatisfied(template: FormTemplate, fieldId: string, values: Record<string, unknown>): boolean {
  const found = findFieldSection(template, fieldId);
  if (!found) return false;
  const { section } = found;
  if (section.repeatable) {
    const entries = (values[section.id] as Record<string, unknown>[] | undefined) ?? [];
    let minRequired = section.minEntries ?? 1;
    if (section.stopAppendWhen) {
      const { fieldId: stopFieldId, value: stopValue } = section.stopAppendWhen;
      const stopped = entries.some((entry) => entry[stopFieldId] === stopValue);
      if (stopped) minRequired = 1;
    }
    const filledCount = entries.filter((entry) => !isEmptyValueLocal(entry[fieldId])).length;
    return filledCount >= minRequired;
  }
  const field = section.fields.find((f) => f.id === fieldId);
  if (field?.type === 'table') {
    if (!isTableFieldFilled(values[fieldId])) return false;
    if (field.validation?.min !== undefined) {
      const rows = Array.isArray(values[fieldId]) ? (values[fieldId] as unknown[]) : [];
      let validCellCount = 0;
      for (const row of rows) {
        if (typeof row !== 'object' || row === null) continue;
        for (const v of Object.values(row as Record<string, unknown>)) {
          if (typeof v === 'string') { if (v.trim()) validCellCount++; }
          else if (typeof v === 'number') { if (v !== 0 && !Number.isNaN(v)) validCellCount++; }
          else if (v !== undefined && v !== null) { validCellCount++; }
        }
      }
      return validCellCount >= field.validation.min;
    }
    return true;
  }
  return !isEmptyValueLocal(values[fieldId]);
}

export function isPhaseCompletionSatisfied(template: FormTemplate, phase: PhaseConfig, values: Record<string, unknown>): boolean {
  return phase.completionFields.every((fieldId) => isCompletionFieldSatisfied(template, fieldId, values));
}

/**
 * 默认值解析：existingValue 非空则原样保留；否则按 field.defaultValue 解析：
 * - 'auto_today' / 'auto_today+N'：今天 / N 天后（格式 yyyy-MM-dd）
 * - 'auto_now' / 'auto_now+N'：当前时间 / N 天后（格式 yyyy-MM-ddTHH:mm）
 * - 其他字符串/对象：原样返回
 *
 * `nowISO` 形如 `yyyy-MM-ddTHH:mm`，默认按传入值；用于测试注入。`todayISO` 兼容只到日的旧调用。
 */
export function resolveDefaultValue(field: FormField, existingValue: unknown, todayISO: string, nowISO?: string): unknown {
  if (!isEmptyValueLocal(existingValue)) return existingValue;
  const now = nowISO ?? `${todayISO}T00:00`;
  if (field.defaultValue === 'auto_today') return todayISO;
  if (typeof field.defaultValue === 'string' && field.defaultValue.startsWith('auto_today+')) {
    const days = parseInt(field.defaultValue.slice('auto_today+'.length), 10);
    if (!isNaN(days)) return format(addDays(parseISO(todayISO), days), 'yyyy-MM-dd');
  }
  if (field.defaultValue === 'auto_now') return now;
  if (typeof field.defaultValue === 'string' && field.defaultValue.startsWith('auto_now+')) {
    const days = parseInt(field.defaultValue.slice('auto_now+'.length), 10);
    if (!isNaN(days)) return format(addDays(parseISO(now.slice(0, 10)), days), "yyyy-MM-dd'T'HH:mm");
  }
  if (field.defaultValue !== undefined) return field.defaultValue;
  return existingValue;
}

export interface PhaseLockContext {
  todayISO: string;
  createdAtISO: string;
}

export interface MissingField {
  sectionId: string;
  fieldId: string;
  label: string;
}

/**
 * 计算当前应聚焦的阶段下标。规则：前一阶段完成度不满足则停留在前一阶段；
 * 否则若本阶段完成度不满足，则停在本阶段（正在填写）；全部满足则停在最后一个阶段。
 */
export function getCurrentPhaseIndex(template: FormTemplate, values: Record<string, unknown>, _context: PhaseLockContext): number {
  const phases = template.phases;
  if (!phases || phases.length === 0) return 0;
  for (let i = 0; i < phases.length; i++) {
    if (i > 0 && !isPhaseCompletionSatisfied(template, phases[i - 1], values)) {
      return i - 1;
    }
    if (!isPhaseCompletionSatisfied(template, phases[i], values)) {
      return i;
    }
  }
  return phases.length - 1;
}

/** 提交前的整体质量检查：列出所有必填字段（含重复段每条目）中仍为空的项，以及 table 类型字段的最少行数校验。 */
export function validateRequiredFields(template: FormTemplate, values: Record<string, unknown>): MissingField[] {
  const missing: MissingField[] = [];
  for (const section of template.sections) {
    const requiredFields = section.fields.filter((f) => f.required);
    if (section.repeatable) {
      const entries = (values[section.id] as Record<string, unknown>[] | undefined) ?? [];
      const minEntries = section.minEntries ?? 1;
      if (entries.length < minEntries) {
        missing.push({ sectionId: section.id, fieldId: section.fields[0].id, label: `${section.title}（至少需要 ${minEntries} 条）` });
      }
      entries.forEach((entry, idx) => {
        // 尊重 section.stopAppendWhen：前一层已标记为根因/停止条件，
        // 后续层不再强制必填（5Why/要因分析等"可停止追问"的场景）
        if (idx > 0 && section.stopAppendWhen) {
          const prevEntry = entries[idx - 1];
          if (prevEntry && prevEntry[section.stopAppendWhen.fieldId] === section.stopAppendWhen.value) {
            return;
          }
        }
        requiredFields.forEach((f) => {
          if (isEmptyValueLocal(entry[f.id])) {
            missing.push({ sectionId: `${section.id}[${idx}]`, fieldId: f.id, label: f.label });
          }
        });
      });
    } else {
      requiredFields.forEach((f) => {
        if (isEmptyValueLocal(values[f.id])) {
          missing.push({ sectionId: section.id, fieldId: f.id, label: f.label });
        }
      });
      section.fields.forEach((f) => {
        if (f.type === 'table' && f.validation?.min !== undefined) {
          const rows = Array.isArray(values[f.id]) ? (values[f.id] as unknown[]) : [];
          // 对 15×15 因果矩阵这类"行列数固定、每格是数字"的 table：
          // validation.min 视为"至少需要多少个有效单元格"（count 非零/非空），而不是"多少行有效"。
          let validCellCount = 0;
          for (const row of rows) {
            if (typeof row !== 'object' || row === null) continue;
            for (const v of Object.values(row as Record<string, unknown>)) {
              if (typeof v === 'string') {
                if (v.trim()) validCellCount++;
              } else if (typeof v === 'number') {
                if (v !== 0 && !Number.isNaN(v)) validCellCount++;
              } else if (v !== undefined && v !== null) {
                validCellCount++;
              }
            }
          }
          if (validCellCount < f.validation.min) {
            missing.push({ sectionId: section.id, fieldId: f.id, label: `${f.label}（至少需要 ${f.validation.min} 个有效数据，当前 ${validCellCount} 个）` });
          }
        }
      });
    }
  }
  return missing;
}
