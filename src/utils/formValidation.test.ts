import { describe, expect, it } from 'vitest';
import {
  getCurrentPhaseIndex,
  isCompletionFieldSatisfied,
  resolveDefaultValue,
  validateRequiredFields,
} from './formValidation';
import { fiveWhyTemplate } from '../templates/fiveWhy';
import type { FormField, FormTemplate } from '../types';

const PHASELESS_TEMPLATE: FormTemplate = {
  id: 'fiveWhy',
  name: '无阶段模板（测试用）',
  icon: '⚡',
  description: '用于验证引擎对不配置 phases 的模板的通用支持',
  sections: [{ id: 'main', title: '主体', fields: [{ id: 'problem', label: '问题', type: 'textarea', required: true }] }],
};

describe('resolveDefaultValue', () => {
  const todayISO = '2026-08-10';

  it('fills auto_today when existing value is empty', () => {
    const field: FormField = { id: 'occurredAt', label: '发生时间', type: 'date', defaultValue: 'auto_today' };
    expect(resolveDefaultValue(field, undefined, todayISO)).toBe(todayISO);
    expect(resolveDefaultValue(field, '', todayISO)).toBe(todayISO);
  });

  it('keeps existing non-empty value untouched', () => {
    const field: FormField = { id: 'occurredAt', label: '发生时间', type: 'date', defaultValue: 'auto_today' };
    expect(resolveDefaultValue(field, '2026-01-01', todayISO)).toBe('2026-01-01');
  });

  it('falls back to a static defaultValue when provided', () => {
    const field: FormField = { id: 'status', label: '状态', type: 'select', defaultValue: 'pending' };
    expect(resolveDefaultValue(field, undefined, todayISO)).toBe('pending');
  });

  it('returns existing value unchanged when no defaultValue is configured', () => {
    const field: FormField = { id: 'title', label: '标题', type: 'text' };
    expect(resolveDefaultValue(field, undefined, todayISO)).toBeUndefined();
  });
});

describe('isCompletionFieldSatisfied - repeatable section (5 Why chain)', () => {
  it('is not satisfied when fewer than minEntries(2) rows exist', () => {
    const values = { whyChain: [{ why: '因为 A' }] };
    expect(isCompletionFieldSatisfied(fiveWhyTemplate, 'why', values)).toBe(false);
  });

  it('is satisfied once minEntries rows exist and at least one has the field filled', () => {
    const values = { whyChain: [{ why: '因为 A' }, { why: '因为 B' }] };
    expect(isCompletionFieldSatisfied(fiveWhyTemplate, 'why', values)).toBe(true);
  });

  it('is not satisfied when rows exist but the field itself is empty in all of them', () => {
    const values = { whyChain: [{ why: '' }, { why: '  ' }] };
    expect(isCompletionFieldSatisfied(fiveWhyTemplate, 'why', values)).toBe(false);
  });
});

describe('getCurrentPhaseIndex', () => {
  const base = { todayISO: '2026-08-10', createdAtISO: '2026-08-01' };

  it('returns 0 for a template without phases', () => {
    expect(getCurrentPhaseIndex(PHASELESS_TEMPLATE, {}, base)).toBe(0);
  });

  it('stays on phase 0 until problem definition is complete', () => {
    expect(getCurrentPhaseIndex(fiveWhyTemplate, {}, base)).toBe(0);
  });

  it('advances to phase 1 once phase 0 completion fields are filled', () => {
    const values = { title: '标题', problemStatement: '一句话陈述', symptom: '现象描述' };
    expect(getCurrentPhaseIndex(fiveWhyTemplate, values, base)).toBe(1);
  });

  it('advances to phase 2 (根因结论) once the why chain has >=2 entries', () => {
    const values = {
      title: '标题',
      problemStatement: '一句话陈述',
      symptom: '现象',
      whyChain: [{ why: 'A' }, { why: 'B' }],
    };
    expect(getCurrentPhaseIndex(fiveWhyTemplate, values, base)).toBe(2);
  });

  it('stays on the last phase (根因结论) when completion fields are not yet filled', () => {
    const values = {
      title: '标题',
      problemStatement: '一句话陈述',
      symptom: '现象',
      whyChain: [{ why: 'A' }, { why: 'B' }],
    };
    expect(getCurrentPhaseIndex(fiveWhyTemplate, values, base)).toBe(2);
  });

  it('remains on last phase once all fields are complete', () => {
    const values = {
      title: '标题',
      problemStatement: '一句话陈述',
      symptom: '现象',
      whyChain: [{ why: 'A' }, { why: 'B' }],
      rootCauseSummary: '根因',
    };
    expect(getCurrentPhaseIndex(fiveWhyTemplate, values, base)).toBe(2);
  });
});

describe('validateRequiredFields', () => {
  it('reports missing required fields across normal and repeatable sections', () => {
    const missing = validateRequiredFields(fiveWhyTemplate, { whyChain: [{ why: '' }] });
    const fieldIds = missing.map((m) => m.fieldId);
    expect(fieldIds).toContain('title');
    expect(fieldIds).toContain('problemStatement');
    expect(fieldIds).toContain('symptom');
    expect(fieldIds).toContain('why');
    expect(fieldIds).toContain('rootCauseSummary');
  });

  it('returns an empty list when all required fields are filled', () => {
    const missing = validateRequiredFields(fiveWhyTemplate, {
      title: 't',
      problemStatement: 'p',
      symptom: 's',
      whyChain: [{ why: 'a' }],
      rootCauseSummary: 'r',
    });
    expect(missing).toHaveLength(0);
  });
});
