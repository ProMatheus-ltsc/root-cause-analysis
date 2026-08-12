/**
 * 5Why 追问阶梯图（WhyLadderChart）：把 whyChain 每层追问画成"问题 → 逐层 Why → 根因"的阶梯链路。
 * - 顶部为问题（problemTitle），每层 why 向下递减呈现（阶梯式纵深）
 * - 每层显示：第 N 层 Why、why 内容、证据类型徽章
 * - isRootCause === 'yes' 的层高亮为根因终点（红色/金色）
 */
import { useMemo, type ReactNode } from 'react';

interface WhyEntry {
  why?: string;
  evidenceType?: string;
  evidence?: string;
  isRootCause?: string;
}

interface WhyLadderChartProps {
  problemTitle?: string;
  entries: WhyEntry[];
}

const FONT = 'ui-sans-serif, system-ui, sans-serif';

const EVIDENCE_LABELS: Record<string, string> = {
  fact: '客观事实',
  data: '数据',
  opinion: '主观观点',
  emotion: '情绪感受',
  primary: '一手数据',
  secondary: '二手数据',
  uncertain: '来源不确定',
};

const EVIDENCE_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  fact: { bg: '#d1fae5', fg: '#065f46', border: '#10b981' },
  data: { bg: '#dbeafe', fg: '#1e40af', border: '#3b82f6' },
  opinion: { bg: '#fef3c7', fg: '#92400e', border: '#f59e0b' },
  emotion: { bg: '#fce7f3', fg: '#9d174d', border: '#ec4899' },
};

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

export function WhyLadderChart({ problemTitle, entries }: WhyLadderChartProps) {
  const chain = useMemo(() => entries.filter((e) => e && typeof e.why === 'string' && e.why.trim()), [entries]);

  if (chain.length === 0) return null;

  const rootIdx = chain.findIndex((e) => e.isRootCause === 'yes');
  const levels = chain.length + 1; // 问题 + N 层 why
  const stepX = 42; // 每层向右偏移（阶梯感）
  const boxW = 520;
  const boxH = 64;
  const gapY = 92;
  const width = 640;
  const startY = 64;
  const height = startY + (levels - 1) * gapY + boxH + 12;

  // 每行：0 = 问题层，1..N = why 层
  const rows = [
    {
      label: '问题',
      text: problemTitle || '待分析的问题',
      isRoot: false,
      evidenceType: undefined,
      evidence: undefined,
    },
    ...chain.map((e, i) => ({
      label: `第 ${i + 1} 层 Why`,
      text: e.why ?? '',
      isRoot: i === rootIdx,
      evidenceType: e.evidenceType,
      evidence: e.evidence,
    })),
  ];

  const parts: ReactNode[] = [];

  rows.forEach((row, i) => {
    const x = 40 + Math.min(i * stepX, (width - boxW - 40));
    const y = startY + i * gapY;
    const isRoot = row.isRoot;

    // 阶梯连接线（从上一行右端到本行左端）
    if (i > 0) {
      const prevX = 40 + Math.min((i - 1) * stepX, width - boxW - 40);
      const prevY = startY + (i - 1) * gapY;
      parts.push(
        <path
          key={`conn-${i}`}
          d={`M ${prevX + boxW} ${prevY + boxH / 2} L ${x + 14} ${prevY + boxH / 2} L ${x + 14} ${y + boxH / 2} L ${x} ${y + boxH / 2}`}
          fill="none"
          stroke={isRoot ? '#e11d48' : '#94a3b8'}
          strokeWidth={2}
          strokeDasharray={isRoot ? 'none' : '4 3'}
          markerEnd="url(#arrowWhy)"
        />
      );
    }

    // 盒子
    const boxColor = isRoot
      ? { bg: '#fef2f2', border: '#e11d48', title: '#991b1b' }
      : i === 0
        ? { bg: '#eef2ff', border: '#6366f1', title: '#3730a3' }
        : { bg: '#f8fafc', border: '#cbd5e1', title: '#334155' };

    parts.push(
      <g key={`box-${i}`}>
        <rect x={x} y={y} width={boxW} height={boxH} rx={10} fill={boxColor.bg} stroke={boxColor.border} strokeWidth={isRoot ? 2.5 : 1.5} />
        <text x={x + 14} y={y + 18} fontSize={11} fontWeight={500} fill={boxColor.title} fontFamily={FONT}>
          {row.label}
          {isRoot && '  ← 根因'}
        </text>
        <text x={x + 14} y={y + 40} fontSize={13} fill="#1e293b" fontFamily={FONT}>
          {truncate(row.text, 58)}
        </text>
        {row.evidenceType && EVIDENCE_LABELS[row.evidenceType] && (
          <g>
            <rect x={x + boxW - 108} y={y + 8} width={96} height={20} rx={10} fill={EVIDENCE_COLORS[row.evidenceType]?.bg ?? '#f1f5f9'} stroke={EVIDENCE_COLORS[row.evidenceType]?.border ?? '#94a3b8'} strokeWidth={1} />
            <text x={x + boxW - 60} y={y + 18} fontSize={10.5} fontWeight={500} fill={EVIDENCE_COLORS[row.evidenceType]?.fg ?? '#334155'} textAnchor="middle" dominantBaseline="central" fontFamily={FONT}>
              {EVIDENCE_LABELS[row.evidenceType]}
            </text>
          </g>
        )}
      </g>,
    );
  });

  // 根因标注线
  const rootLineY = startY + rootIdx * gapY + boxH + 4;
  const rootLineX = 40 + Math.min(rootIdx * stepX, width - boxW - 40) + boxW - 12;
  const rootLineX2 = 40 + Math.min(rootIdx * stepX, width - boxW - 40) + 12;
  if (rootIdx >= 0) {
    parts.push(
      <g key="root-flag">
        <path d={`M ${rootLineX2} ${rootLineY} L ${rootLineX} ${rootLineY}`} fill="none" stroke="#e11d48" strokeWidth={2} />
        <path d={`M ${rootLineX} ${rootLineY} L ${rootLineX - 10} ${rootLineY - 4} L ${rootLineX - 10} ${rootLineY + 4} Z`} fill="#e11d48" />
      </g>,
    );
  }

  // 底部说明
  const noteY = height + 18;
  const note =
    rootIdx >= 0
      ? `共追问 ${chain.length} 层，第 ${rootIdx + 1} 层确认为根因${chain[rootIdx].evidence ? '：' + truncate(chain[rootIdx].evidence, 40) : ''}`
      : `共追问 ${chain.length} 层，尚未标记根因`;

  return (
    <div className="overflow-x-auto rounded-xl border border-surface-200 bg-surface-0">
      <svg viewBox={`0 0 ${width} ${noteY + 20}`} width="100%" role="img" aria-label="5Why 追问阶梯图">
        <title>5Why 追问阶梯图</title>
        <desc>从问题逐层追问 Why 到根因的阶梯链路</desc>
        <defs>
          <marker id="arrowWhy" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        </defs>
        {parts}
        <text x={40} y={noteY} fontSize={11.5} fill={rootIdx >= 0 ? '#b91c1c' : '#64748b'} fontFamily={FONT}>
          {note}
        </text>
      </svg>
    </div>
  );
}
