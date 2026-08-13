/**
 * 分析结果导出（JSON 极简版）：只需"问题描述 / 根因 / 果因"三要素，便于粘贴到其他页面使用。
 * - 问题描述：问题标题 + 一句话陈述 + 标准问题陈述
 * - 根因（rootCauses）：要因分析法中得分最低（最源头）的因素；其他方法取根因总结/确认结论
 * - 果因（surfaceCauses）：要因分析法中得分最高（最表象，作为"果"最多）的因素
 * 该文件把"表单里零散填写的字段"整理成一行可直接复用的摘要，供导出与分享使用。
 */
import type { FormRecord, FormTemplate, Problem } from '../types';
import { computeKeyFactors, buildGeneratedProblemStatement } from '../templates/shared';

/** 内部参数集合：一条记录、其模板、关联的问题实体、当前表单填写的全部字段值。 */
interface ExportParams {
  problem?: Problem;
  record: FormRecord;
  template: FormTemplate;
  values: Record<string, unknown>;
}

/** 极简导出结果的形状：一段问题描述 + 根因列表 + 果因列表。 */
export interface AnalysisExportJson {
  problemDescription: string;
  rootCauses: string[];
  surfaceCauses: string[];
}

/**
 * 把一条分析记录整理成极简 JSON（问题描述 / 根因 / 果因）。
 * @param params.problem 关联的问题实体（可能没有，此时只依赖记录自身标题）
 * @param params.record  要导出的分析记录
 * @param params.template 记录所属模板，决定如何从字段中提取根因/果因
 * @param params.values  模板表单当前填写的全部字段值
 * @returns 符合 AnalysisExportJson 结构的三要素结果
 */
export function buildAnalysisExportJson({ problem, record, template, values }: ExportParams): AnalysisExportJson {
  const pData = problem?.data ?? {};
  const generated = buildGeneratedProblemStatement(pData);
  // 问题标准描述：优先用自动生成的"标准问题陈述"（问题 = 目标 − 现实）
  // 未生成时（占位文案说明用户没填完整 4W2H）退回到手写陈述/标题/记录标题
  const description =
    generated !== '（填写 4W2H 表格后自动生成）'
      ? generated
      : (problem?.problemStatement?.trim() ?? problem?.title?.trim() ?? record.title);

  let rootCauses: string[] = [];
  let surfaceCauses: string[] = [];

  // 要因分析法（keyFactor）有评分体系，可以量化地分出"根因"与"表因"；其他模板没有，走文本字段提取
  if (template.id === 'keyFactor') {
    const results = computeKeyFactors(values);
    const sorted = [...results].sort((a, b) => a.score - b.score);
    // 先按角色标记直接取：角色为 root 的因子即根因，role 为 surface 的即表因
    const roots = results.filter((r) => r.role === 'root').map((r) => r.name);
    const surfaces = results.filter((r) => r.role === 'surface').map((r) => r.name);
    // 固定阈值区分不出时，用相对视角兜底：得分最低=根因（最源头），最高=表因（最表象）。
    // 空数组是"假值"（falsy），所以 roots.length ? ... 能自然区分"有角色结果"和"没有角色结果"；
    // 连 sorted[0] 都不存在（结果为空）时，兜底到空数组。
    rootCauses = roots.length ? roots : sorted[0] ? [sorted[0].name] : [];
    surfaceCauses = surfaces.length ? surfaces : sorted[sorted.length - 1] ? [sorted[sorted.length - 1].name] : [];
  } else {
    // 非 keyFactor 模板：根因取"确认的关键要因"优先，没确认就退回"根因总结"，两者都为空则返回空数组
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
