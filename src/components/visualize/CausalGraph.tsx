import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  MarkerType,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface CausalEntry {
  factorA: string;
  factorB: string;
  relationType: string;
  delayEffect?: string;
  evidence?: string;
}

interface CausalGraphProps {
  causalChain: CausalEntry[];
}

const RELATION_COLORS: Record<string, string> = {
  reinforcing: '#10b981',
  balancing: '#f59e0b',
  causal: '#6366f1',
  none: '#94a3b8',
};

const RELATION_LABELS: Record<string, string> = {
  reinforcing: '正反馈',
  balancing: '负反馈',
  causal: '因果',
  none: '无关',
};

export function CausalGraph({ causalChain }: CausalGraphProps) {
  const { nodes, edges } = useMemo(() => {
    const factorSet = new Set<string>();
    for (const entry of causalChain) {
      if (entry.factorA) factorSet.add(entry.factorA);
      if (entry.factorB) factorSet.add(entry.factorB);
    }

    const factors = Array.from(factorSet);
    const cols = Math.ceil(Math.sqrt(factors.length));

    const nodeList: Node[] = factors.map((factor, idx) => ({
      id: factor,
      data: { label: factor },
      position: {
        x: (idx % cols) * 220 + 50,
        y: Math.floor(idx / cols) * 120 + 50,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: {
        background: '#f8fafc',
        border: '2px solid #6366f1',
        borderRadius: '12px',
        padding: '8px 16px',
        fontSize: '13px',
        fontWeight: 500,
        color: '#1e293b',
        minWidth: '100px',
        textAlign: 'center' as const,
      },
    }));

    const edgeList: Edge[] = causalChain
      .filter((entry) => entry.relationType && entry.relationType !== 'none' && entry.factorA && entry.factorB)
      .map((entry, idx) => ({
        id: `e-${idx}`,
        source: entry.factorA,
        target: entry.factorB,
        label: RELATION_LABELS[entry.relationType] || entry.relationType,
        animated: entry.relationType === 'reinforcing',
        style: { stroke: RELATION_COLORS[entry.relationType] || '#94a3b8', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: RELATION_COLORS[entry.relationType] || '#94a3b8' },
        labelStyle: { fontSize: 11, fill: '#64748b' },
      }));

    return { nodes: nodeList, edges: edgeList };
  }, [causalChain]);

  if (nodes.length === 0) {
    return (
      <div className="rounded-xl border border-surface-200 bg-surface-50 p-8 text-center text-sm text-text-tertiary">
        完成因果链分析后，此处将显示因果关系图
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-surface-200 overflow-hidden" style={{ height: 400 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e2e8f0" gap={16} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
