/**
 * 问题摘要卡片：在分析记录列表中展示关联问题的核心信息。
 * 交互流程：默认折叠只显示问题标题，点击标题展开显示 4W2H 判定/类型/目标、自动生成的问题陈述、
 * 以及原因头脑风暴候选清单。可选 showLink 展示"查看问题详情"跳转链接。
 * 核心概念：直接从问题的结构化 data 中提取展示字段，与模板字段配置解耦。
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Problem } from '../types';
import { W2H_OPTIONS, buildGeneratedProblemStatement } from '../templates/shared';
import { PROBLEM_CRITERIA_OPTIONS, PROBLEM_TYPE_OPTIONS } from '../templates/shared';

interface ProblemSummaryCardProps {
  problem: Problem;
  showLink?: boolean;
}

/** 把存储在问题 data 里的选项值（可能是单个字符串或数组）翻译成对应的中文 label；查不到则返回 undefined。 */
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

/**
 * 问题摘要卡片组件。
 * @param problem 问题实体，展示数据取自 problem.data 中的 4W2H 表、头脑风暴、判定/类型等字段
 * @param showLink 为 true 时显示"查看问题详情"跳转链接
 */
export function ProblemSummaryCard({ problem, showLink = false }: ProblemSummaryCardProps) {
  // 默认折叠，点击标题切换展开/收起
  const [collapsed, setCollapsed] = useState(true);
  const data = problem.data ?? {};
  // 4W2H 表格行（二维表：维度 + 描述）
  const rows = Array.isArray(data['w2hTable']) ? (data['w2hTable'] as Array<{ dimension: string; description: string }>) : [];
  // 头脑风暴候选原因：过滤掉"原因为空"的无效行
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
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center gap-1 text-sm font-semibold text-sky-900 hover:text-sky-700"
        >
          <span className={`inline-block transition-transform ${collapsed ? '' : 'rotate-90'}`}>▶</span>
          {problem.title}
        </button>
        <div className="flex items-center gap-2">
          {showLink && (
            <Link to={`/problem/${problem.id}`} className="shrink-0 text-xs text-sky-600 hover:underline">
              查看问题详情 →
            </Link>
          )}
        </div>
      </div>
      {problem.problemStatement && <p className="mb-2 text-sm text-slate-700">{problem.problemStatement}</p>}
      {!collapsed && (
        <>
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
          {/* 只有用户真正填过内容（不是模板默认提示文案）时才展示自动生成的问题陈述 */}
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
              {brainstorm.length > 8 && (
                <p className="mt-1 text-center text-[10px] text-sky-500">↕ 滚动查看更多</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
