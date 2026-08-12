/**
 * 横向时间线 SVG：按 time 升序排列节点，isKeyMoment 节点放大 + 高亮；
 * 节点上下交替展示事件描述、当时的行动与事后评估（actionCorrectness 配色）。
 * 节点下方条带呈现"事件节点 → 当时行动 → 事后评估"的纵向时间脉络。
 */
import { useMemo } from 'react';

interface TimelineEntry {
  time: string;
  eventDesc: string;
  sourceType?: string;
  isKeyMoment?: boolean;
  actionTaken?: string;
  actionCorrectness?: 'correct' | 'wrong' | 'improvable' | 'unclear' | string;
}

interface TimelineChartProps {
  /** 整体事件描述，置于图顶部 */
  eventSummary?: string;
  entries: TimelineEntry[];
}

const ACTION_COLORS: Record<string, { stroke: string; fill: string; label: string }> = {
  correct: { stroke: '#10b981', fill: '#d1fae5', label: '正确' },
  wrong: { stroke: '#ef4444', fill: '#fee2e2', label: '错误' },
  improvable: { stroke: '#f59e0b', fill: '#fef3c7', label: '可优化' },
  unclear: { stroke: '#94a3b8', fill: '#f1f5f9', label: '无法判断' },
};

function parseTime(t: string): number {
  // 支持 "HH:MM" / "HH:MM:SS" / "上午 9:30"（去掉非数字冒号）→ 返回分钟数；空值给 +Infinity 排到最后
  if (!t) return Number.POSITIVE_INFINITY;
  const m = t.match(/(\d{1,2})\s*[:：]\s*(\d{1,2})/);
  if (!m) return Number.POSITIVE_INFINITY;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function TimelineChart({ eventSummary, entries }: TimelineChartProps) {
  const sorted = useMemo(() => {
    return [...entries]
      .map((e, idx) => ({ entry: e, idx }))
      .sort((a, b) => parseTime(a.entry.time) - parseTime(b.entry.time) || a.idx - b.idx);
  }, [entries]);

  const nodeCount = sorted.length;
  // 自适应宽度：每个节点 220px，最少 800px
  const width = Math.max(800, nodeCount * 220 + 120);
  const height = 360;
  const padX = 60;
  const padY = 80;
  const lineY = height / 2;
  const usable = width - padX * 2;

  if (nodeCount === 0) return null;

  const lines: string[] = [];
  const texts: Array<{ x: number; y: number; text: string; size: number; weight?: string; fill?: string; anchor?: string }> = [];

  // 主轴
  lines.push(`<line x1="${padX}" y1="${lineY}" x2="${width - padX}" y2="${lineY}" stroke="#6366f1" stroke-width="3" />`);

  sorted.forEach((item, i) => {
    // 横向均匀布点：第 i 个节点放在 0~1 区间中的 i/(nodeCount-1) 处。
    // 特判 nodeCount===1：只有一个节点时 (n-1)=0 会除零，直接居中放置。
    const x = nodeCount === 1 ? padX + usable / 2 : padX + (usable * i) / (nodeCount - 1);
    const e = item.entry;
    const isKey = !!e.isKeyMoment;
    const r = isKey ? 14 : 8;
    const cy = lineY;

    // 节点圆点（关键节点：白心红圈 + 阴影；普通节点：白心灰边）
    if (isKey) {
      lines.push(`<circle cx="${x}" cy="${cy}" r="${r + 4}" fill="#fef3c7" />`);
      lines.push(`<circle cx="${x}" cy="${cy}" r="${r}" fill="#fff" stroke="#ef4444" stroke-width="3" />`);
    } else {
      lines.push(`<circle cx="${x}" cy="${cy}" r="${r}" fill="#fff" stroke="#475569" stroke-width="2" />`);
    }

    // 上下交替放卡片（i 偶数上，奇数下），避免重叠。
    // 若全部放同一侧，卡片宽 180px、节点间距 220px 时会互相压住；
    // 交替布局把相邻卡片错到主轴两侧，水平上即使接近也不冲突。
    const above = i % 2 === 0;
    const cardY = above ? padY - 60 : lineY + 30;
    const cardH = 90;
    const cardW = 180;
    const cardX = x - cardW / 2; // 卡片水平居中于节点
    const cardFill = '#ffffff';
    const cardStroke = isKey ? '#fbbf24' : '#e2e8f0';
    lines.push(
      `<rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="8" fill="${cardFill}" stroke="${cardStroke}" stroke-width="${isKey ? 2 : 1}" />`,
    );
    // 引导线（节点到卡片）：从节点圆边缘出发，画到卡片靠近轴的那一边
    lines.push(`<line x1="${x}" y1="${cy + (above ? -r : r)}" x2="${x}" y2="${above ? cardY + cardH : cardY}" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="2,3" />`);

    // 时间标签（在轴上下）
    texts.push({
      x,
      y: above ? cardY - 8 : lineY + r + 14,
      text: e.time || `节点 ${i + 1}`,
      size: 11,
      weight: '600',
      fill: isKey ? '#b91c1c' : '#475569',
      anchor: 'middle',
    });

    // 卡片内文字：事件描述 / 当时行动 / 事后评估（最多 3 行）
    const actionColor = ACTION_COLORS[e.actionCorrectness ?? ''] ?? ACTION_COLORS.unclear;
    const textLines = [
      { t: e.eventDesc || '（无描述）', color: '#1f2937', bold: true },
      ...(e.actionTaken ? [{ t: `▶ ${e.actionTaken.length > 28 ? e.actionTaken.slice(0, 28) + '…' : e.actionTaken}`, color: '#64748b', bold: false }] : []),
      ...(e.actionCorrectness && ACTION_COLORS[e.actionCorrectness]
        ? [{ t: `■ 评估：${actionColor.label}`, color: actionColor.stroke, bold: false }]
        : []),
    ];
    textLines.forEach((tl, li) => {
      texts.push({
        x: cardX + 8,
        y: cardY + 14 + li * 16,
        text: tl.t,
        size: 10,
        weight: tl.bold ? '600' : '400',
        fill: tl.color,
        anchor: 'start',
      });
    });

    // 节点编号小标（圆点右下）
    texts.push({
      x: x + r - 2,
      y: cy + r + 10,
      text: `#${item.idx + 1}`,
      size: 9,
      fill: '#94a3b8',
      anchor: 'start',
    });

    // 关键标记徽章
    if (isKey) {
      const badgeX = x - r - 3;
      const badgeY = cy - r - 14;
      lines.push(`<rect x="${badgeX - 8}" y="${badgeY - 8}" width="40" height="14" rx="3" fill="#ef4444" />`);
      texts.push({ x: badgeX + 12, y: badgeY + 2, text: '★ 关键', size: 9, fill: '#fff', anchor: 'middle', weight: '600' });
    }
  });

  // 顶部：事件摘要
  if (eventSummary) {
    texts.unshift({
      x: width / 2,
      y: 22,
      text: `📌 ${eventSummary.length > 60 ? eventSummary.slice(0, 60) + '…' : eventSummary}`,
      size: 12,
      weight: '600',
      fill: '#1e293b',
      anchor: 'middle',
    });
  }

  // 底部图例
  const legendY = height - 18;
  texts.push({ x: padX, y: legendY, text: '● 普通节点', size: 10, fill: '#475569', anchor: 'start' });
  texts.push({ x: padX + 80, y: legendY, text: '● 关键节点', size: 10, fill: '#b91c1c', anchor: 'start' });
  texts.push({ x: padX + 160, y: legendY, text: '■ 评估：正确', size: 10, fill: '#10b981', anchor: 'start' });
  texts.push({ x: padX + 240, y: legendY, text: '■ 评估：错误', size: 10, fill: '#ef4444', anchor: 'start' });
  texts.push({ x: padX + 320, y: legendY, text: '■ 评估：可优化', size: 10, fill: '#f59e0b', anchor: 'start' });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="${height}">
  <rect width="100%" height="100%" fill="#f8fafc" />
  ${lines.join('\n  ')}
  ${texts
    .map(
      (t) =>
        `<text x="${t.x}" y="${t.y}" font-size="${t.size}" font-family="ui-sans-serif, system-ui, -apple-system, sans-serif" font-weight="${t.weight ?? 400}" fill="${t.fill ?? '#0f172a'}" text-anchor="${t.anchor ?? 'start'}">${escape(t.text)}</text>`,
    )
    .join('\n  ')}
</svg>`;
  return <div dangerouslySetInnerHTML={{ __html: svg }} className="overflow-x-auto rounded-lg border border-slate-200 bg-white" />;
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}