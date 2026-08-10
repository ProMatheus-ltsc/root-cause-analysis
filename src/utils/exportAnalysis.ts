/**
 * 分析结果导出（JSON 极简版）：只需"问题描述 / 根因 / 果因"三要素，便于粘贴到其他页面使用。
 * - 问题描述：问题标题 + 一句话陈述 + 标准问题陈述
 * - 根因（rootCauses）：要因分析法中得分最低（最源头）的因素；其他方法取根因总结/确认结论
 * - 果因（surfaceCauses）：要因分析法中得分最高（最表象，作为"果"最多）的因素
 */
import type { FormRecord, FormTemplate, Problem } from '../types';
import { computeKeyFactors, buildGeneratedProblemStatement } from '../templates/shared';

interface ExportParams {
  problem?: Problem;
  record: FormRecord;
  template: FormTemplate;
  values: Record<string, unknown>;
}

export interface AnalysisExportJson {
  problemDescription: string;
  rootCauses: string[];
  surfaceCauses: string[];
}

export function buildAnalysisExportJson({ problem, record, template, values }: ExportParams): AnalysisExportJson {
  const pData = problem?.data ?? {};
  const generated = buildGeneratedProblemStatement(pData);
  // 问题标准描述：优先用自动生成的"标准问题陈述"（问题 = 目标 − 现实）
  const description =
    generated !== '（填写 4W2H 表格后自动生成）'
      ? generated
      : (problem?.problemStatement?.trim() ?? problem?.title?.trim() ?? record.title);

  let rootCauses: string[] = [];
  let surfaceCauses: string[] = [];

  if (template.id === 'keyFactor') {
    const results = computeKeyFactors(values);
    const sorted = [...results].sort((a, b) => a.score - b.score);
    const roots = results.filter((r) => r.role === 'root').map((r) => r.name);
    const surfaces = results.filter((r) => r.role === 'surface').map((r) => r.name);
    // 固定阈值区分不出时，用相对视角兜底：得分最低=根因（最源头），最高=表因（最表象）
    rootCauses = roots.length ? roots : sorted[0] ? [sorted[0].name] : [];
    surfaceCauses = surfaces.length ? surfaces : sorted[sorted.length - 1] ? [sorted[sorted.length - 1].name] : [];
  } else {
    const summary = typeof values['rootCauseSummary'] === 'string' && values['rootCauseSummary'].trim() ? (values['rootCauseSummary'] as string).trim() : '';
    const confirmed =
      typeof values['keyFactorsConfirmed'] === 'string' && values['keyFactorsConfirmed'].trim() ? (values['keyFactorsConfirmed'] as string).trim() : '';
    rootCauses = [confirmed || summary].filter(Boolean);
  }

  return {
    problemDescription: description,
    rootCauses,
    surfaceCauses,
  };
}
