/**
 * 表单引擎核心纯函数：默认值解析、阶段完成度判定、必填字段校验。
 * 所有函数不依赖 Date.now()/当前时间——需要"现在"时统一由调用方以 ISO 日期字符串注入，便于测试。
 */
import { addDays, format, parseISO } from 'date-fns';
import type { FormField, FormSection, FormTemplate, PhaseConfig } from '../types';

export function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** existingValue 非空则原样保留；否则按 field.defaultValue 解析（'auto_today' 转为传入的今日日期字符串，'auto_today+N' 转为 N 天后）。 */
export function resolveDefaultValue(field: FormField, existingValue: unknown, todayISO: string): unknown {
  if (!isEmptyValue(existingValue)) return existingValue;
  if (field.defaultValue === 'auto_today') return todayISO;
  if (typeof field.defaultValue === 'string' && field.defaultValue.startsWith('auto_today+')) {
    const days = parseInt(field.defaultValue.slice('auto_today+'.length), 10);
    if (!isNaN(days)) return format(addDays(parseISO(todayISO), days), 'yyyy-MM-dd');
  }
  if (field.defaultValue !== undefined) return field.defaultValue;
  return existingValue;
}

function findFieldSection(template: FormTemplate, fieldId: string): { section: FormSection; index: number } | undefined {
  for (let index = 0; index < template.sections.length; index++) {
    const section = template.sections[index];
    if (section.fields.some((f) => f.id === fieldId)) {
      return { section, index };
    }
  }
  return undefined;
}

/** 判断某个 completionFields 中列出的字段 id 在当前数据下是否已满足（非重复段=非空；重复段=至少 minEntries 条目该字段非空）。 */
export function isCompletionFieldSatisfied(template: FormTemplate, fieldId: string, values: Record<string, unknown>): boolean {
  const found = findFieldSection(template, fieldId);
  if (!found) return false;
  const { section } = found;
  if (section.repeatable) {
    const entries = (values[section.id] as Record<string, unknown>[] | undefined) ?? [];
    const minEntries = section.minEntries ?? 1;
    const filledCount = entries.filter((entry) => !isEmptyValue(entry[fieldId])).length;
    return filledCount >= minEntries;
  }
  return !isEmptyValue(values[fieldId]);
}

export function isPhaseCompletionSatisfied(template: FormTemplate, phase: PhaseConfig, values: Record<string, unknown>): boolean {
  return phase.completionFields.every((fieldId) => isCompletionFieldSatisfied(template, fieldId, values));
}

export interface PhaseLockContext {
  todayISO: string;
  createdAtISO: string;
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

export interface MissingField {
  sectionId: string;
  fieldId: string;
  label: string;
}

/** 提交前的整体质量检查：列出所有必填字段（含重复段每条目）中仍为空的项。 */
export function validateRequiredFields(template: FormTemplate, values: Record<string, unknown>): MissingField[] {
  const missing: MissingField[] = [];
  for (const section of template.sections) {
    const requiredFields = section.fields.filter((f) => f.required);
    if (requiredFields.length === 0) continue;
    if (section.repeatable) {
      const entries = (values[section.id] as Record<string, unknown>[] | undefined) ?? [];
      entries.forEach((entry, idx) => {
        requiredFields.forEach((f) => {
          if (isEmptyValue(entry[f.id])) {
            missing.push({ sectionId: `${section.id}[${idx}]`, fieldId: f.id, label: f.label });
          }
        });
      });
    } else {
      requiredFields.forEach((f) => {
        if (isEmptyValue(values[f.id])) {
          missing.push({ sectionId: section.id, fieldId: f.id, label: f.label });
        }
      });
    }
  }
  return missing;
}
