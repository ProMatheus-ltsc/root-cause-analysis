/**
 * 回路检测算法：从因果链数据构建有向图，通过 DFS 找出所有环路。
 * 根据环路中"负反馈"(balancing)边的数量判断回路类型：
 * - 偶数个负反馈边 → 增强回路（Reinforcing Loop）：偏差会被放大
 * - 奇数个负反馈边 → 调节回路（Balancing Loop）：偏差会被抑制
 * 杠杆点识别：出现在最多回路中的因素节点，干预此处效果最大。
 */

interface CausalEdge {
  from: string;
  to: string;
  relationType: 'reinforcing' | 'balancing' | 'causal' | 'none' | '';
}

export interface DetectedLoop {
  type: 'reinforcing' | 'balancing';
  typeLabel: string;
  nodes: string[];
  edges: CausalEdge[];
}

export interface LoopDetectionResult {
  loops: DetectedLoop[];
  leveragePoints: { factor: string; loopCount: number }[];
}

function buildGraph(edges: CausalEdge[]): Map<string, CausalEdge[]> {
  const graph = new Map<string, CausalEdge[]>();
  for (const edge of edges) {
    if (!graph.has(edge.from)) graph.set(edge.from, []);
    graph.get(edge.from)!.push(edge);
  }
  return graph;
}

function findAllCycles(graph: Map<string, CausalEdge[]>, nodes: string[]): CausalEdge[][] {
  const cycles: CausalEdge[][] = [];
  const visited = new Set<string>();
  const stack: string[] = [];
  const stackSet = new Set<string>();

  function dfs(node: string, path: CausalEdge[]) {
    if (cycles.length >= 20) return;
    visited.add(node);
    stack.push(node);
    stackSet.add(node);

    const neighbors = graph.get(node) ?? [];
    for (const edge of neighbors) {
      if (cycles.length >= 20) return;
      if (stackSet.has(edge.to)) {
        const cycleStartIdx = stack.indexOf(edge.to);
        const cyclePath = [...path.slice(cycleStartIdx), edge];
        if (cyclePath.length >= 2) {
          cycles.push(cyclePath);
        }
      } else if (!visited.has(edge.to)) {
        dfs(edge.to, [...path, edge]);
      }
    }

    stack.pop();
    stackSet.delete(node);
    visited.delete(node);
  }

  for (const node of nodes) {
    if (cycles.length >= 20) break;
    dfs(node, []);
  }

  return cycles;
}

function classifyLoop(edges: CausalEdge[]): 'reinforcing' | 'balancing' {
  let balancingCount = 0;
  for (const edge of edges) {
    if (edge.relationType === 'balancing') balancingCount++;
  }
  return balancingCount % 2 === 0 ? 'reinforcing' : 'balancing';
}

function deduplicateLoops(cycles: CausalEdge[][]): CausalEdge[][] {
  const seen = new Set<string>();
  const unique: CausalEdge[][] = [];
  for (const cycle of cycles) {
    const nodeNames = cycle.map((e) => e.from);
    const sorted = [...nodeNames].sort();
    const key = sorted.join('|||');
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(cycle);
    }
  }
  return unique;
}

export function detectLoops(values: Record<string, unknown>): LoopDetectionResult {
  const rawChain = Array.isArray(values['causalChain']) ? (values['causalChain'] as Array<Record<string, unknown>>) : [];

  const edges: CausalEdge[] = rawChain
    .filter((entry) => {
      const rel = entry.relationType as string;
      return rel && rel !== 'none' && rel !== '' && entry.factorA && entry.factorB;
    })
    .map((entry) => ({
      from: (entry.factorA as string).trim(),
      to: (entry.factorB as string).trim(),
      relationType: entry.relationType as CausalEdge['relationType'],
    }));

  if (edges.length < 2) {
    return { loops: [], leveragePoints: [] };
  }

  const nodeSet = new Set<string>();
  for (const e of edges) {
    nodeSet.add(e.from);
    nodeSet.add(e.to);
  }
  const nodes = Array.from(nodeSet);

  const graph = buildGraph(edges);
  const rawCycles = findAllCycles(graph, nodes);
  const uniqueCycles = deduplicateLoops(rawCycles);

  const loops: DetectedLoop[] = uniqueCycles.map((cycle) => {
    const type = classifyLoop(cycle);
    return {
      type,
      typeLabel: type === 'reinforcing' ? '增强回路' : '调节回路',
      nodes: cycle.map((e) => e.from),
      edges: cycle,
    };
  });

  const factorLoopCount = new Map<string, number>();
  for (const loop of loops) {
    for (const node of loop.nodes) {
      factorLoopCount.set(node, (factorLoopCount.get(node) ?? 0) + 1);
    }
  }

  const leveragePoints = Array.from(factorLoopCount.entries())
    .map(([factor, loopCount]) => ({ factor, loopCount }))
    .sort((a, b) => b.loopCount - a.loopCount)
    .slice(0, 5);

  return { loops, leveragePoints };
}

export function detectLoopsText(values: Record<string, unknown>): string {
  const result = detectLoops(values);

  if (result.loops.length === 0) {
    return '（尚未检测到回路——请在因果链中建立至少一条环形因果关系，如 A→B→C→A）';
  }

  const lines: string[] = [];

  const reinforcing = result.loops.filter((l) => l.type === 'reinforcing');
  const balancing = result.loops.filter((l) => l.type === 'balancing');

  if (reinforcing.length > 0) {
    lines.push(`🔴 增强回路（${reinforcing.length} 条）—— 偏差会自我放大，形成恶性/良性循环：`);
    for (const loop of reinforcing) {
      const chain = [...loop.nodes, loop.nodes[0]].join(' → ');
      lines.push(`  · ${chain}`);
    }
  }

  if (balancing.length > 0) {
    lines.push(`🔵 调节回路（${balancing.length} 条）—— 偏差会被抑制，系统趋于稳定：`);
    for (const loop of balancing) {
      const chain = [...loop.nodes, loop.nodes[0]].join(' → ');
      lines.push(`  · ${chain}`);
    }
  }

  if (result.leveragePoints.length > 0) {
    lines.push('');
    lines.push('🎯 建议杠杆点（出现在最多回路中的因素，干预此处影响最大）：');
    for (const lp of result.leveragePoints) {
      lines.push(`  · ${lp.factor}（参与 ${lp.loopCount} 条回路）`);
    }
  }

  if (reinforcing.length > 0 && balancing.length === 0) {
    lines.push('');
    lines.push('⚠️ 仅检测到增强回路、无调节回路：系统处于失控放大状态，建议在杠杆点引入负反馈机制进行抑制。');
  } else if (balancing.length > 0 && reinforcing.length === 0) {
    lines.push('');
    lines.push('💡 仅检测到调节回路：系统有自我稳定倾向，如需改变现状需打破调节机制或引入增强回路驱动变化。');
  }

  return lines.join('\n');
}
