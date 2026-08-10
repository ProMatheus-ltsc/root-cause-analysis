import { describe, expect, it } from 'vitest';
import {
  countByDisplayStatus,
  daysSinceLastExport,
  extractTopKeywords,
  getDisplayStatus,
  recentRecords,
  rootCauseTypeDistribution,
} from './dashboard';
import { fiveWhyTemplate } from '../templates/fiveWhy';
import type { FormRecord, FormTemplate, TemplateId } from '../types';

const TEMPLATES = { fiveWhy: fiveWhyTemplate } as Record<TemplateId, FormTemplate>;

const PHASELESS_TEMPLATE: FormTemplate = {
  id: 'fiveWhy',
  name: '无阶段模板（测试用）',
  icon: '⚡',
  description: '用于验证引擎对不配置 phases 的模板的通用支持',
  sections: [{ id: 'main', title: '主体', fields: [{ id: 'problem', label: '问题', type: 'textarea', required: true }] }],
};

function makeRecord(overrides: Partial<FormRecord>): FormRecord {
  return {
    id: 'r1',
    templateId: 'fiveWhy',
    title: '标题',
    data: {},
    status: 'draft',
    createdAt: '2026-08-01',
    updatedAt: '2026-08-01',
    ...overrides,
  };
}

describe('getDisplayStatus', () => {
  const todayISO = '2026-08-10';

  it('draft with no phase progress is 待分析', () => {
    const record = makeRecord({ data: {} });
    expect(getDisplayStatus(fiveWhyTemplate, record, todayISO)).toBe('待分析');
  });

  it('draft mid-way through phases is 分析中', () => {
    const record = makeRecord({ data: { title: 't', symptom: 's' } });
    expect(getDisplayStatus(fiveWhyTemplate, record, todayISO)).toBe('分析中');
  });

  it('completed is 已关闭', () => {
    const record = makeRecord({
      status: 'completed',
      data: { rootCauseSummary: 'r' },
    });
    expect(getDisplayStatus(fiveWhyTemplate, record, todayISO)).toBe('已关闭');
  });

  it('template without phases closes immediately once completed', () => {
    const record = makeRecord({ status: 'completed', data: {} });
    expect(getDisplayStatus(PHASELESS_TEMPLATE, record, todayISO)).toBe('已关闭');
  });
});

describe('countByDisplayStatus', () => {
  it('aggregates counts across records', () => {
    const todayISO = '2026-08-10';
    const records = [
      makeRecord({ id: '1', data: {} }),
      makeRecord({ id: '2', data: { title: 't', symptom: 's' } }),
    ];
    const counts = countByDisplayStatus(records, TEMPLATES, todayISO);
    expect(counts.待分析).toBe(1);
    expect(counts.分析中).toBe(1);
  });
});

describe('rootCauseTypeDistribution', () => {
  it('counts only records that carry a rootCauseType value', () => {
    const records = [
      makeRecord({ id: '1', data: { rootCauseType: 'process' } }),
      makeRecord({ id: '2', data: { rootCauseType: 'process' } }),
      makeRecord({ id: '3', data: { rootCauseType: 'technical' } }),
      makeRecord({ id: '4', data: {} }),
    ];
    const dist = rootCauseTypeDistribution(records);
    expect(dist.find((d) => d.type === 'process')?.count).toBe(2);
    expect(dist.find((d) => d.type === 'technical')?.count).toBe(1);
    expect(dist.every((d) => d.count > 0)).toBe(true);
  });
});

describe('extractTopKeywords', () => {
  it('extracts and ranks repeated tokens from lessonsLearned', () => {
    const records = [
      makeRecord({ id: '1', data: { lessonsLearned: '沟通不足，需要加强沟通。流程也有问题。' } }),
      makeRecord({ id: '2', data: { lessonsLearned: '沟通不足。这是主因。' } }),
    ];
    const keywords = extractTopKeywords(records, 5);
    expect(keywords[0].keyword).toBe('沟通不足');
    expect(keywords[0].count).toBe(2);
  });
});

describe('recentRecords', () => {
  it('sorts by updatedAt desc and caps to the limit', () => {
    const records = [
      makeRecord({ id: '1', updatedAt: '2026-08-01' }),
      makeRecord({ id: '2', updatedAt: '2026-08-05' }),
      makeRecord({ id: '3', updatedAt: '2026-08-03' }),
    ];
    const recent = recentRecords(records, 2);
    expect(recent.map((r) => r.id)).toEqual(['2', '3']);
  });
});

describe('daysSinceLastExport', () => {
  it('returns undefined when never exported', () => {
    expect(daysSinceLastExport(undefined, '2026-08-10')).toBeUndefined();
  });

  it('computes calendar days between the last export timestamp and today', () => {
    expect(daysSinceLastExport('2026-07-11T03:00:00.000Z', '2026-08-10')).toBe(30);
  });

  it('returns 0 for an export that happened today', () => {
    expect(daysSinceLastExport('2026-08-10T23:00:00.000Z', '2026-08-10')).toBe(0);
  });
});
