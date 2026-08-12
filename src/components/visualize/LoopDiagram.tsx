/**
 * 系统思考回路图（LoopDiagram）：把 AI 解析出的反馈回路画成闭环环图。
 * - 每个 loop 一个环形：causes 按顺序围成一圈，箭头闭环连接
 * - reinforcing（恶性循环）红色系，balancing（平衡环）绿色系
 * - 杠杆点命中节点（leveragePoints 的 cause）加星标高亮
 * - 环中心显示回路名 + 类型；下方展示链路与 description
 */
import { useMemo } from 'react';
import type { AiAnalysisResult } from '../../utils/aiAnalysis';

interface LoopDiagramProps {
  result: AiAnalysisResult;
}

const RING_COLORS = {
  reinforcing: { stroke: '#e11d48', fill: '#ffe4e6', text: '#9f1239', label: '恶性循环 · 正反馈' },
  balancing: { stroke: '#059669', fill: '#d1fae5', text: '#065f46', label: '平衡环 · 负反馈' },
};

const FONT = 'ui-sans-serif, system-ui, sans-serif';

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

export function LoopDiagram({ result }: LoopDiagramProps) {
  const { loops, leveragePoints } = result;
  const leverageSet = useMemo(
    () => new Set((leveragePoints ?? []).map((p) => p.cause?.trim()).filter(Boolean)),
    [leveragePoints],
  );

  if (!loops || loops.length === 0) return null;

  const PER_RING = 360;
  const LEVERAGE_HEADER = 26;
  const leverageItems = (leveragePoints ?? [])
    .map((p) => {
      const lines = [`★ ${p.cause}`];
      if (p.intervention) lines.push(`干预：${p.intervention}`);
      if (p.reason) lines.push(`依据：${p.reason}`);
      return lines;
    })
    .flat();
  const leverageHeight = leverageItems.length > 0 ? LEVERAGE_HEADER + leverageItems.length * 18 + 8 : 0;
  const totalHeight = loops.length * PER_RING + 24 + leverageHeight;

  return (
    <div className="overflow-x-auto rounded-xl border border-surface-200 bg-surface-0">
      <svg viewBox={`0 0 720 ${totalHeight}`} width="100%" role="img" aria-label="系统思考反馈回路图">
        <title>系统思考反馈回路图</title>
        <desc>AI 识别出的反馈回路闭环与杠杆点</desc>
        <defs>
          <marker
            id="arrowLoop"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        </defs>

        {loops.map((loop, loopIdx) => {
          // ---- 环形布局的数学原理（初学者看这里）----
          // 把 n 个原因节点均匀分布在半径为 R 的圆周上：
          //   角度 angle_i = -90° + i × (360°/n)
          //  -90° 起点的作用：让第 1 个节点位于正上方（12 点方向），符合阅读习惯。
          //   节点坐标 = 圆心 + R × (cos angle, sin angle)，即极坐标 → 直角坐标。
          const cx = 360;
          const cy = loopIdx * PER_RING + 140; // 每个 loop 纵向错开 PER_RING，避免上下重叠
          const R = 104;
          const n = loop.causes.length;
          const color = RING_COLORS[loop.type] ?? RING_COLORS.reinforcing;

          const points = loop.causes.map((_, i) => {
            const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
            return { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) };
          });

          const titleLines = loop.name.length > 14 ? [loop.name.slice(0, 14), loop.name.slice(14)] : [loop.name];
          const badgeY = cy + (titleLines.length > 1 ? 20 : 10);

          return (
            <g key={loopIdx}>
              {/* 主环：虚线圆示意回路的边界 */}
              <circle cx={cx} cy={cy} r={R} fill="none" stroke={color.stroke} strokeWidth={2} strokeDasharray="6 4" opacity={0.4} />

              {/* 环上箭头 + 序号：每段相邻节点之间画一条贝塞尔曲线箭头，表示"因果关系方向" */}
              {points.map((p, i) => {
                const p2 = points[(i + 1) % n]; // (i+1) % n：最后一个节点指向第 0 个，首尾相连成环
                // 弧线中点（放在圆周外侧 20px），用于放置序号文字
                const midAngle = -Math.PI / 2 + ((i + 0.5) * 2 * Math.PI) / n;
                const mx = cx + (R + 20) * Math.cos(midAngle);
                const my = cy + (R + 20) * Math.sin(midAngle);
                // 切线方向：圆周上某点的切线 = (-sin θ, cos θ)。
                // 贝塞尔曲线的控制点沿切线方向外推 46px，让曲线"贴着圆周走"而不是切直线，
                // 视觉上形成顺滑的弧线箭头。
                const tang1 = {
                  x: -Math.sin(-Math.PI / 2 + (i * 2 * Math.PI) / n),
                  y: Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / n),
                };
                const tang2 = {
                  x: -Math.sin(-Math.PI / 2 + ((i + 1) * 2 * Math.PI) / n),
                  y: Math.cos(-Math.PI / 2 + ((i + 1) * 2 * Math.PI) / n),
                };
                return (
                  <g key={i}>
                    <path
                      d={`M ${p.x} ${p.y} C ${p.x + tang1.x * 46} ${p.y + tang1.y * 46}, ${p2.x - tang2.x * 46} ${p2.y - tang2.y * 46}, ${p2.x} ${p2.y}`}
                      fill="none"
                      stroke={color.stroke}
                      strokeWidth={2.5}
                      markerEnd="url(#arrowLoop)"
                    />
                    <text x={mx} y={my} fontSize={12} fontWeight={500} fill={color.stroke} textAnchor="middle" fontFamily={FONT}>
                      {i + 1}
                    </text>
                  </g>
                );
              })}

              {/* 节点 + 节点名（节点圈放圆周，文字放圆外，避免遮挡中央回路名） */}
              {loop.causes.map((cause, i) => {
                const p = points[i];
                const isLeverage = leverageSet.has(cause.trim());
                const r = isLeverage ? 15 : 10;
                const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
                // 节点圆画在圆周；文字放圆外侧，按角度决定锚点（左/中/右）
                const labelR = R + 22;
                const lx = cx + labelR * Math.cos(angle);
                const ly = cy + labelR * Math.sin(angle);
                // 文字锚点：根据 cos(angle) 决定 start/middle/end，对应左/中/右。
                // 原理：节点在圆右侧（cos>0.3）时文字往右排（start）；在左侧（cos<-0.3）往左排（end），
                // 中间（正上/正下）居中——保证文字始终朝外、不会探进圆内遮挡中央回路名。
                const cosA = Math.cos(angle);
                const sinA = Math.sin(angle);
                const anchor: 'start' | 'middle' | 'end' = cosA > 0.3 ? 'start' : cosA < -0.3 ? 'end' : 'middle';
                // 垂直微调：正上/正下的文字上下偏移 4px，避免与节点圆相切
                const dy = sinA < -0.3 ? -4 : sinA > 0.3 ? 4 : 0;
                const labelLines = cause.length > 8 ? [cause.slice(0, 8), cause.slice(8, 16)] : [cause];
                return (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r={r} fill={color.fill} stroke={isLeverage ? '#f59e0b' : color.stroke} strokeWidth={isLeverage ? 3 : 2} />
                    {isLeverage ? (
                      <text x={p.x} y={p.y} fontSize={13} fill="#b45309" textAnchor="middle" dominantBaseline="central" fontFamily={FONT}>
                        ★
                      </text>
                    ) : (
                      <text x={p.x} y={p.y} fontSize={10.5} fontWeight={500} fill={color.text} textAnchor="middle" dominantBaseline="central" fontFamily={FONT}>
                        {i + 1}
                      </text>
                    )}
                    {labelLines.map((line, li) => (
                      <text
                        key={li}
                        x={lx}
                        y={ly + dy + (li - (labelLines.length - 1) / 2) * 13}
                        fontSize={10.5}
                        fill="#334155"
                        textAnchor={anchor}
                        dominantBaseline="central"
                        fontFamily={FONT}
                      >
                        {line}
                      </text>
                    ))}
                  </g>
                );
              })}

              {/* 回路名 */}
              {titleLines.map((line, li) => (
                <text key={li} x={cx} y={cy - 12 + li * 16} fontSize={14} fontWeight={500} fill="#0f172a" textAnchor="middle" fontFamily={FONT}>
                  {line}
                </text>
              ))}
              {/* 类型徽章 */}
              <rect x={cx - 66} y={badgeY} width={132} height={22} rx={11} fill={color.stroke} opacity={0.12} />
              <text x={cx} y={badgeY + 11} fontSize={11.5} fontWeight={500} fill={color.stroke} textAnchor="middle" dominantBaseline="central" fontFamily={FONT}>
                {color.label}
              </text>

              {/* 链路 + 说明 */}
              <text x={cx} y={cy + R + 34} fontSize={11.5} fill="#475569" textAnchor="middle" fontFamily={FONT}>
                {truncate(loop.causes.map((c, i) => `${i + 1} ${c}`).join(' → '), 60)}
              </text>
              {loop.description &&
                [loop.description].map((d, di) => (
                  <text key={di} x={cx} y={cy + R + 52} fontSize={11} fill="#64748b" textAnchor="middle" fontFamily={FONT}>
                    {truncate(d, 52)}
                  </text>
                ))}
            </g>
          );
        })}

        {/* 杠杆点区 */}
        {leverageItems.length > 0 && (
          <g>
            <text x={40} y={loops.length * PER_RING + 24} fontSize={12.5} fontWeight={500} fill="#b45309" fontFamily={FONT}>
              🎯 杠杆点（施加最小干预产生最大改变）
            </text>
            {leverageItems.map((line, i) => (
              <text key={i} x={40} y={loops.length * PER_RING + 46 + i * 18} fontSize={11.5} fill="#475569" fontFamily={FONT}>
                {truncate(line, 92)}
              </text>
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}
