/**
 * 对比差异图（ComparisonDiffChart）：把 comparisonTable 的「正常 vs 异常 vs 关键差异」
 * 画成每维度一条对照横条的差异图。
 * - 每维度一行：左为正常表现（绿），右为异常表现（红），中间为关键差异标记
 * - 正常/异常文本按长度折算成横条宽度，视觉上直接看出哪一维度差异最大
 * - 顶部为正常情况 / 异常情况摘要（normalCase / abnormalCase）
 */
import { useMemo } from 'react';

interface ComparisonRow {
  dimension?: string;
  normal?: string;
  abnormal?: string;
  diff?: string;
}

interface ComparisonDiffChartProps {
  normalCase?: string;
  abnormalCase?: string;
  rows: ComparisonRow[];
}

const FONT = 'ui-sans-serif, system-ui, sans-serif';

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

export function ComparisonDiffChart({ normalCase, abnormalCase, rows }: ComparisonDiffChartProps) {
  const validRows = useMemo(() => rows.filter((r) => r && (r.normal?.trim() || r.abnormal?.trim())), [rows]);

  if (validRows.length === 0) return null;

  const rowH = 96;
  const headerH = normalCase || abnormalCase ? 96 : 0;
  const legendH = 26;
  const labelW = 130;
  const barW = 150;
  const height = headerH + legendH + validRows.length * rowH + 20;

  // 文本长度 → 条宽（8 字以下按比例，超过封顶）
  const barLen = (s: string) => Math.max(24, Math.min(barW - 12, s.replace(/\s/g, '').length * 8 + 20));

  return (
    <div className="overflow-x-auto rounded-xl border border-surface-200 bg-surface-0">
      <svg viewBox={`0 0 640 ${height}`} width="100%" role="img" aria-label="对比分析差异图">
        <title>对比分析差异图</title>
        <desc>正常情况与异常情况在各维度的对照差异</desc>
        <defs>
          <marker id="arrowDiff" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        </defs>

        {headerH > 0 && (
          <g>
            <text x={40} y={26} fontSize={12} fontWeight={500} fill="#065f46" fontFamily={FONT}>
              正常情况
            </text>
            <text x={40} y={46} fontSize={12} fill="#475569" fontFamily={FONT}>
              {truncate(normalCase ?? '', 90)}
            </text>
            <line x1={40} y1={54} x2={600} y2={54} stroke="#e2e8f0" strokeWidth={1} />
            <text x={40} y={72} fontSize={12} fontWeight={500} fill="#991b1b" fontFamily={FONT}>
              异常情况
            </text>
            <text x={40} y={92} fontSize={12} fill="#475569" fontFamily={FONT}>
              {truncate(abnormalCase ?? '', 90)}
            </text>
          </g>
        )}

        {/* 图例 */}
        <g fontFamily={FONT}>
          <rect x={40} y={headerH + 8} width={14} height={10} rx={3} fill="#10b981" />
          <text x={60} y={headerH + 18} fontSize={11} fill="#475569">正常</text>
          <rect x={120} y={headerH + 8} width={14} height={10} rx={3} fill="#ef4444" />
          <text x={140} y={headerH + 18} fontSize={11} fill="#475569">异常</text>
          <rect x={200} y={headerH + 8} width={14} height={10} rx={3} fill="#f59e0b" />
          <text x={220} y={headerH + 18} fontSize={11} fill="#475569">关键差异</text>
        </g>

        {validRows.map((row, idx) => {
          const y = headerH + legendH + idx * rowH + 12;
          const normalText = row.normal ?? '';
          const abnormalText = row.abnormal ?? '';
          const diffText = row.diff ?? '';

          return (
            <g key={idx} fontFamily={FONT}>
              {/* 维度名 */}
              <text x={40} y={y + rowH / 2 - 4} fontSize={12.5} fontWeight={500} fill="#0f172a">
                {truncate(row.dimension || `维度 ${idx + 1}`, 10)}
              </text>
              <text x={40} y={y + rowH / 2 + 14} fontSize={10.5} fill="#94a3b8">
                {idx + 1}
              </text>

              {/* 正常条 */}
              <rect x={labelW} y={y + 12} width={barLen(normalText)} height={20} rx={5} fill="#d1fae5" stroke="#10b981" strokeWidth={1} />
              <text x={labelW + 8} y={y + 22} fontSize={11} fill="#065f46" dominantBaseline="central">
                {truncate(normalText, 14)}
              </text>

              {/* 异常条 */}
              <rect x={labelW} y={y + 46} width={barLen(abnormalText)} height={20} rx={5} fill="#fee2e2" stroke="#ef4444" strokeWidth={1} />
              <text x={labelW + 8} y={y + 56} fontSize={11} fill="#991b1b" dominantBaseline="central">
                {truncate(abnormalText, 14)}
              </text>

              {/* 差异箭头 + 文本 */}
              {diffText && (
                <g>
                  <line x1={labelW + barW + 14} y1={y + 24} x2={labelW + barW + 34} y2={y + 38} stroke="#f59e0b" strokeWidth={2} markerEnd="url(#arrowDiff)" />
                  <text x={labelW + barW + 42} y={y + 36} fontSize={11.5} fill="#92400e" fontWeight={500}>
                    {truncate(diffText, 24)}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
