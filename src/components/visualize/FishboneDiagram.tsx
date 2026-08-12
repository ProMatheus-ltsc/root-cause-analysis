import { useMemo } from 'react';

interface FishboneCategory {
  name: string;
  causes: string[];
}

interface FishboneDiagramProps {
  problemTitle: string;
  categories: FishboneCategory[];
}

export function FishboneDiagram({ problemTitle, categories }: FishboneDiagramProps) {
  const svgContent = useMemo(() => {
    const width = 900;
    const height = 400;
    const spineY = height / 2;
    const headX = width - 80;
    const tailX = 60;
    const categoryCount = categories.length;

    if (categoryCount === 0) return null;

    const spacing = (headX - tailX - 40) / Math.max(categoryCount, 1);

    const lines: string[] = [];
    const texts: Array<{ x: number; y: number; text: string; size: number; weight: string; anchor: string }> = [];

    lines.push(`<line x1="${tailX}" y1="${spineY}" x2="${headX}" y2="${spineY}" stroke="#6366f1" stroke-width="3" />`);
    lines.push(`<polygon points="${headX},${spineY - 12} ${headX + 20},${spineY} ${headX},${spineY + 12}" fill="#6366f1" />`);

    texts.push({ x: headX + 30, y: spineY + 5, text: problemTitle.length > 12 ? problemTitle.slice(0, 12) + '…' : problemTitle, size: 13, weight: '600', anchor: 'start' });

    categories.forEach((cat, idx) => {
      const baseX = tailX + 40 + idx * spacing;
      const isTop = idx % 2 === 0;
      const branchEndY = isTop ? spineY - 100 : spineY + 100;
      const angle = isTop ? -45 : 45;

      lines.push(`<line x1="${baseX}" y1="${spineY}" x2="${baseX}" y2="${branchEndY}" stroke="#94a3b8" stroke-width="2" />`);

      texts.push({
        x: baseX,
        y: isTop ? branchEndY - 12 : branchEndY + 18,
        text: cat.name,
        size: 12,
        weight: '600',
        anchor: 'middle',
      });

      cat.causes.slice(0, 4).forEach((cause, ci) => {
        const causeY = isTop
          ? branchEndY + 20 + ci * 18
          : branchEndY - 20 - ci * 18;
        const causeX = baseX + (ci % 2 === 0 ? -10 : 10);

        lines.push(`<line x1="${baseX}" y1="${causeY + (isTop ? -8 : 8)}" x2="${baseX}" y2="${causeY}" stroke="#cbd5e1" stroke-width="1" />`);
        texts.push({
          x: causeX,
          y: causeY + 4,
          text: cause.length > 8 ? cause.slice(0, 8) + '…' : cause,
          size: 10,
          weight: '400',
          anchor: 'middle',
        });
      });
    });

    return { width, height, lines, texts };
  }, [problemTitle, categories]);

  if (!svgContent || categories.length === 0) {
    return (
      <div className="rounded-xl border border-surface-200 bg-surface-50 p-8 text-center text-sm text-text-tertiary">
        完成鱼骨图分析后，此处将显示可视化鱼骨图
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-surface-200 overflow-x-auto bg-surface-0 p-2" role="img" aria-label="鱼骨图（因果分析图）">
      <svg
        viewBox={`0 0 ${svgContent.width} ${svgContent.height}`}
        className="w-full h-auto min-h-[300px]"
        xmlns="http://www.w3.org/2000/svg"
      >
        {svgContent.lines.map((line, idx) => (
          <g key={idx} dangerouslySetInnerHTML={{ __html: line }} />
        ))}
        {svgContent.texts.map((t, idx) => (
          <text
            key={idx}
            x={t.x}
            y={t.y}
            fontSize={t.size}
            fontWeight={t.weight}
            textAnchor={t.anchor}
            fill="#334155"
          >
            {t.text}
          </text>
        ))}
      </svg>
    </div>
  );
}
