/**
 * 问题摘要卡片：只读展示问题实体的关键信息。
 * 用于分析页顶部（做分析时随时查看问题）与问题详情页。
 */
import { Link } from 'react-router-dom';
import type { Problem } from '../types';
import { W2H_OPTIONS, buildGeneratedProblemStatement } from '../templates/shared';
import { PROBLEM_CRITERIA_OPTIONS, PROBLEM_TYPE_OPTIONS } from '../templates/shared';

interface ProblemSummaryCardProps {
  problem: Problem;
  /** 是否显示"查看问题详情"链接（分析页传 false 或省略） */
  showLink?: boolean;
}

function getOptionLabel(options: { value: string; label: string }[], value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const labels = value
      .map((v) => options.find((o) => o.value === v)?.label)
      .filter((l): l is string => Boolean(l));
    return labels.length ? labels.join('；') : undefined;
  }
  const v = typeof value === 'string' ? value : undefined;
  return v ? options.find((o) => o.value === v)?.label : undefined;
}

export function ProblemSummaryCard({ problem, showLink = false }: ProblemSummaryCardProps) {
  const data = problem.data ?? {};
  const rows = Array.isArray(data['w2hTable']) ? (data['w2hTable'] as Array<{ dimension: string; description: string }>) : [];
  const brainstorm = Array.isArray(data['brainstorm'])
    ? (data['brainstorm'] as Array<{ cause?: string; evidence?: string }>).filter((c) => typeof c.cause === 'string' && c.cause.trim())
    : [];
  const criteriaLabel = getOptionLabel(PROBLEM_CRITERIA_OPTIONS, data['problemCriteria']);
  const typeLabel = getOptionLabel(PROBLEM_TYPE_OPTIONS, data['problemType']);
  const statement = buildGeneratedProblemStatement(data);
  const target = typeof data['gapTarget'] === 'string' ? (data['gapTarget'] as string).trim() : '';

  return (
    <div className="no-print rounded-lg border border-sky-200 bg-sky-50/60 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-sky-900">{problem.title}</p>
        {showLink && (
          <Link to={`/problem/${problem.id}`} className="shrink-0 text-xs text-sky-600 hover:underline">
            查看问题详情 →
          </Link>
        )}
      </div>
      {problem.problemStatement && <p className="mb-2 text-sm text-slate-700">{problem.problemStatement}</p>}
      <div className="mb-2 text-xs text-slate-500">
        {criteriaLabel && <span className="mr-3">判定：{criteriaLabel}</span>}
        {typeLabel && <span>类型：{typeLabel}</span>}
      </div>
      {rows.length > 0 && (
        <div className="mb-2 grid grid-cols-1 gap-x-4 gap-y-1 text-xs text-slate-600 sm:grid-cols-2">
          {rows
            .filter((row) => row.description && row.description.trim())
            .map((row) => {
              const label = W2H_OPTIONS.find((o) => o.value === row.dimension)?.label ?? row.dimension;
              return (
                <div key={row.dimension} className="flex gap-1">
                  <span className="shrink-0 font-medium text-slate-500">{label.split('——')[0]}：</span>
                  <span>{row.description}</span>
                </div>
              );
            })}
        </div>
      )}
      {target && (
        <p className="text-xs text-slate-600">
          <span className="font-medium text-slate-500">目标：</span>
          {target}
        </p>
      )}
      {statement && statement !== '（填写 4W2H 表格后自动生成）' && (
        <p className="mt-2 rounded bg-white/70 px-2 py-1 text-xs text-slate-700">{statement}</p>
      )}
      {brainstorm.length > 0 && (
        <div className="mt-3 border-t border-sky-200/70 pt-2">
          <p className="mb-1 text-xs font-medium text-sky-800">原因头脑风暴（{brainstorm.length} 个候选原因）</p>
          <ol className="max-h-40 list-inside list-decimal overflow-y-auto text-xs text-slate-600">
            {brainstorm.map((c, idx) => (
              <li key={idx} className="leading-relaxed">
                {c.cause}
                {c.evidence && c.evidence.trim() && <span className="text-slate-400"> —— {c.evidence.trim()}</span>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
