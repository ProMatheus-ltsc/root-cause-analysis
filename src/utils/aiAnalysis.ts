/**
 * 手动桥接外部 AI 分析（系统思考）：
 * - buildSystemThinkPrompt：把问题详情 + 候选原因组装成给外部 AI 的提示词（要求返回 JSON）
 * - parseAiAnalysis：解析并校验 AI 返回的 JSON（回路 + 杠杆点），失败抛中文错误
 */
import type { Problem } from '../types';

export interface AiLoop {
  name: string;
  type: 'reinforcing' | 'balancing';
  causes: string[];
  description?: string;
}

export interface AiLeveragePoint {
  cause: string;
  intervention?: string;
  reason?: string;
}

export interface AiAnalysisResult {
  loops: AiLoop[];
  leveragePoints: AiLeveragePoint[];
}

/** 组装"问题详情 + 候选原因"的导出 JSON（供 AI 分析）。 */
export function buildProblemJson(problem?: Problem): string {
  const data = (problem?.data ?? {}) as Record<string, unknown>;
  const w2h: Record<string, string> = {};
  if (Array.isArray(data.w2hTable)) {
    for (const row of data.w2hTable as Array<Record<string, unknown>>) {
      if (typeof row?.dimension === 'string' && typeof row?.description === 'string' && row.description.trim()) {
        w2h[row.dimension] = row.description.trim();
      }
    }
  }
  const candidateCauses = Array.isArray(data.brainstorm)
    ? (data.brainstorm as Array<Record<string, unknown>>)
        .map((item) => (typeof item?.cause === 'string' ? item.cause.trim() : ''))
        .filter((c) => c.length > 0)
    : [];

  return JSON.stringify(
    {
      problem: {
        title: problem?.title ?? '',
        statement: problem?.problemStatement ?? '',
        gapTarget: typeof data.gapTarget === 'string' ? data.gapTarget : '',
        symptom: typeof data.symptom === 'string' ? data.symptom : '',
        w2h,
      },
      candidateCauses,
    },
    null,
    2,
  );
}

/** 组装给外部 AI 的完整提示词（要求严格返回 JSON）。 */
export function buildSystemThinkPrompt(problem?: Problem): string {
  const payload = buildProblemJson(problem);
  return `你是系统动力学分析师。请基于下面的"问题详情与候选原因"识别系统中的反馈回路和杠杆点。
判断标准：
- 回路（loop）必须形成闭环：原因1→原因2→…→原因1
- 只关注会让"问题越来越坏"的回路（恶性循环 / reinforcing），若确实存在被抑制的平衡环（balancing）也可列出
- 杠杆点（leverage point）是"施加最小干预能产生最大系统改变"的环节
请严格按以下 JSON 格式返回，不要输出任何其他文字：
{
  "loops": [
    {
      "name": "回路名称",
      "type": "reinforcing | balancing",
      "causes": ["环节1", "环节2", "环节3"],
      "description": "用一段话说明这个循环如何自我强化/自我抑制"
    }
  ],
  "leveragePoints": [
    {
      "cause": "杠杆点对应的环节",
      "intervention": "建议的最小干预",
      "reason": "为什么这里是杠杆点"
    }
  ]
}
若未识别到任何闭环回路，请返回：{"loops": [], "leveragePoints": [], "note": "未识别到反馈回路，可能需要补充候选原因"}

问题详情与候选原因：
${payload}`;
}

/**
 * 解析并校验 AI 返回的 JSON（系统思考模式）。
 *
 * 设计要点（初学者先看这里）：
 * - 外部 AI 的输出不可信，必须逐字段校验类型，任何一步不合法就抛中文错误，
 *   由 UI 层直接展示给用户，提示怎么修正。
 * - JSON.parse 之外还要做"语义校验"：顶层必须是对象、loops/leveragePoints 必须是数组、
 *   每条 loop 必须有 name/type/causes 且 causes 至少 2 个元素（少于 2 个成不了闭环）。
 * - 校验通过后才把字符串 trim 后写入结构化对象，避免残留空白。
 *
 * @throws Error 携带中文可读的错误信息
 */
export function parseAiAnalysis(raw: string): AiAnalysisResult {
  const text = raw.trim();
  if (!text) {
    throw new Error('粘贴内容为空');
  }
  // 第一步：语法解析。失败通常是 AI 在 JSON 前后夹带了自然语言（如"好的，以下是…"），
  // 提示用户只返回 JSON；允许 ```json 代码块包裹，trim 后 JSON.parse 可直接处理。
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error('JSON 解析失败——请确认 AI 只返回了 JSON 对象，没有多余文字（可用 ```json 包裹，解析时会自动去除）');
  }
  // 第二步：顶层结构校验。注意 Array.isArray 也是 object，要单独排除。
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    throw new Error('JSON 顶层应为对象 { loops, leveragePoints }');
  }
  const root = obj as Record<string, unknown>;
  // 第三步：两大字段必须是数组（缺一不可，宁可严格也不让后续渲染拿到残缺数据）
  if (!Array.isArray(root.loops) || !Array.isArray(root.leveragePoints)) {
    throw new Error('缺少字段：loops 或 leveragePoints（必须都是数组）');
  }
  // 第四步：逐条校验 loops
  const loops: AiLoop[] = [];
  for (let i = 0; i < root.loops.length; i++) {
    const l = root.loops[i] as Record<string, unknown> | null;
    if (!l || typeof l !== 'object') {
      throw new Error(`loops[${i}] 不是对象`);
    }
    if (typeof l.name !== 'string' || !l.name.trim()) {
      throw new Error(`loops[${i}].name 缺失或为空`);
    }
    // type 是枚举，只允许两个合法值，防止 AI 编造其他类型导致图表判型出错
    if (l.type !== 'reinforcing' && l.type !== 'balancing') {
      throw new Error(`loops[${i}].type 必须为 "reinforcing" 或 "balancing"`);
    }
    // causes 至少 2 个：1 个元素构不成"原因1→原因2→…→原因1"的闭环
    if (!Array.isArray(l.causes) || l.causes.length < 2 || !l.causes.every((c) => typeof c === 'string')) {
      throw new Error(`loops[${i}].causes 必须是不小于 2 个字符串的数组`);
    }
    loops.push({
      name: l.name.trim(),
      type: l.type,
      causes: (l.causes as string[]).map((c) => c.trim()).filter(Boolean), // 去空白 + 丢弃空串
      description: typeof l.description === 'string' && l.description.trim() ? l.description.trim() : undefined,
    });
  }
  // 第五步：逐条校验 leveragePoints（仅 cause 必填，intervention/reason 可选）
  const leveragePoints: AiLeveragePoint[] = [];
  for (let i = 0; i < root.leveragePoints.length; i++) {
    const lp = root.leveragePoints[i] as Record<string, unknown> | null;
    if (!lp || typeof lp !== 'object') {
      throw new Error(`leveragePoints[${i}] 不是对象`);
    }
    if (typeof lp.cause !== 'string' || !lp.cause.trim()) {
      throw new Error(`leveragePoints[${i}].cause 缺失或为空`);
    }
    leveragePoints.push({
      cause: lp.cause.trim(),
      intervention: typeof lp.intervention === 'string' && lp.intervention.trim() ? lp.intervention.trim() : undefined,
      reason: typeof lp.reason === 'string' && lp.reason.trim() ? lp.reason.trim() : undefined,
    });
  }
  return { loops, leveragePoints };
}

/** 把解析结果格式化为可读文本（存 form data 或展示）。 */
export function formatAiAnalysis(result: AiAnalysisResult): string {
  const lines: string[] = [];
  if (result.loops.length === 0) {
    lines.push('未识别到反馈回路');
  } else {
    lines.push(`识别到 ${result.loops.length} 条回路：`);
    result.loops.forEach((l, i) => {
      lines.push(`${i + 1}. ${l.name}（${l.type === 'reinforcing' ? '恶性循环/正反馈' : '平衡环/负反馈'}）`);
      lines.push(`   链路：${l.causes.join(' → ')}`);
      if (l.description) lines.push(`   说明：${l.description}`);
    });
  }
  if (result.leveragePoints.length > 0) {
    lines.push('');
    lines.push(`杠杆点（${result.leveragePoints.length} 个）：`);
    result.leveragePoints.forEach((p, i) => {
      lines.push(`${i + 1}. ${p.cause}`);
      if (p.intervention) lines.push(`   干预：${p.intervention}`);
      if (p.reason) lines.push(`   依据：${p.reason}`);
    });
  }
  return lines.join('\n');
}

// ========== 要因分析法（keyFactor）的 AI 桥接：一次给出所有有向因果对及影响强度 ==========

export interface KeyFactorAiPair {
  cause: string; // 因素名（因）
  effect: string; // 因素名（果）
  strength: 1 | 2 | 4;
  reason?: string;
}

export interface KeyFactorAiResult {
  causalPairs: KeyFactorAiPair[];
}

/** 组装给外部 AI 的提示词：把问题详情 + 因素清单 + 候选原因打包，AI 返回因果对（cause+effect+strength）。 */
export function buildKeyFactorPrompt(problem?: Problem, factors?: string[]): string {
  const probJson = buildProblemJson(problem);
  const factorList = (factors ?? []).map((f, i) => `  ${i + 1}. ${f}`).join('\n');
  return `你是要因分析（DEMATEL）的因果判定助手。请基于下面的"问题详情 + 候选原因 + 因素清单"，
识别所有有方向有强度的因果关系对（i → j），把结果严格按以下 JSON 格式返回（不要输出任何其他文字）：

{
  "causalPairs": [
    {
      "cause": "完整的因素名（从下面 15 个因素中选，必须一字不差）",
      "effect": "完整的因素名（从下面 15 个因素中选，必须一字不差）",
      "strength": 1 | 2 | 4,
      "reason": "为什么是因→果（可选）"
    }
  ]
}

判定标准：
- 只列有正向因果关系的对（cause 导致 effect），无关或反向的不要列
- 强度 1=弱关联（单向弱影响），2=中关联（双向或单向强影响），4=强关联（互为强因果）
- 如果因素 i 是 j 的因，必须 i 在 cause、j 在 effect
- 两个因素之间的最强影响强度作为 strength
- "无关"和"无影响"的关系不要写进 causalPairs
- 若强度为 2 或 4（双向/互为因果），应用会自动同时写入反向强度（j→i），你只需列出正向 cause→effect 即可

## 问题详情
${probJson}

## 因素清单（从 1 到 ${factors?.length ?? 0}，AI 必须用其中"完整原文"作为 cause/effect 字段值）
${factorList || '（无）'}
`;
}

/** 解析 AI 返回的 keyFactor JSON（要因分析法模式）。与 parseAiAnalysis 结构类似，但业务规则不同：
 *  - 校验每个 pair 的 cause/effect 必须能在"因素清单"里找到（AI 经常多打空格或改写，需容错匹配）
 *  - strength 只允许 1/2/4 三个档位
 *  - 校验通过后统一替换成"因素清单里的原始名称"（而不是 AI 写的变体），保证写入矩阵时能精确对上索引
 */
export function parseKeyFactorAnalysis(raw: string, factors: string[]): KeyFactorAiResult {
  const text = raw.trim();
  if (!text) throw new Error('粘贴内容为空');
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error('JSON 解析失败——请确认 AI 只返回了 JSON 对象，没有多余文字（可用 ```json 包裹，解析时会自动去除）');
  }
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    throw new Error('JSON 顶层应为对象 { causalPairs: [...] }');
  }
  const root = obj as Record<string, unknown>;
  if (!Array.isArray(root.causalPairs)) {
    throw new Error('缺少字段：causalPairs（必须是数组）');
  }
  // 建立"因素名 → 索引"映射表，把 O(n) 的查找降为 O(1)。
  // 注意 key 用 trim 后的名称，兼容 AI 输出中的首尾空格。
  const factorIndex = new Map<string, number>();
  factors.forEach((f, i) => factorIndex.set(f.trim(), i));
  // 容错查找：先精确匹配；失败再尝试"子串包含"双向匹配。
  // 为什么用子串？AI 有时会缩写（如把"产品部内部资料覆盖度不足，九年级物理的知识点/题型没有完整对应的内部素材"
  // 简写成"资料覆盖度不足"），子串包含能兜住这类近似。代价是有歧义时可能误匹配，
  // 但"提示词已要求一字不差 + 子串兜底"的组合在实测中够用。
  const lookup = (name: string): number => {
    const trimmed = name.trim();
    if (factorIndex.has(trimmed)) return factorIndex.get(trimmed)!;
    for (const [key, idx] of factorIndex) {
      if (key.includes(trimmed) || trimmed.includes(key)) return idx;
    }
    return -1; // -1 表示找不到，调用方据此报错
  };
  const pairs: KeyFactorAiPair[] = [];
  for (let i = 0; i < root.causalPairs.length; i++) {
    const raw = root.causalPairs[i] as Record<string, unknown> | null;
    if (!raw || typeof raw !== 'object') throw new Error(`causalPairs[${i}] 不是对象`);
    const cause = typeof raw.cause === 'string' ? raw.cause.trim() : '';
    const effect = typeof raw.effect === 'string' ? raw.effect.trim() : '';
    if (!cause) throw new Error(`causalPairs[${i}].cause 缺失或为空`);
    if (!effect) throw new Error(`causalPairs[${i}].effect 缺失或为空`);
    // Number() 兼容 AI 把数字写成字符串的情况（如 "strength": "2"）
    const strengthNum = Number(raw.strength);
    if (strengthNum !== 1 && strengthNum !== 2 && strengthNum !== 4) {
      throw new Error(`causalPairs[${i}].strength 必须为 1/2/4 之一（实际 ${raw.strength}）`);
    }
    const causeIdx = lookup(cause);
    const effectIdx = lookup(effect);
    if (causeIdx < 0) throw new Error(`causalPairs[${i}].cause "${cause}" 不在因素清单中（必须用因素清单里的完整原文）`);
    if (effectIdx < 0) throw new Error(`causalPairs[${i}].effect "${effect}" 不在因素清单中（必须用因素清单里的完整原文）`);
    if (causeIdx === effectIdx) throw new Error(`causalPairs[${i}].cause 和 effect 不能是同一因素`);
    pairs.push({
      // 关键：这里存的是 factors[causeIdx]（清单里的原始全名），而非 AI 传入的 cause 变体，
      // 保证后续写入矩阵时索引一致、展示名称统一。
      cause: factors[causeIdx],
      effect: factors[effectIdx],
      strength: strengthNum as 1 | 2 | 4,
      reason: typeof raw.reason === 'string' ? raw.reason.trim() : undefined,
    });
  }
  return { causalPairs: pairs };
}

/** 把解析结果格式化为可读文本（用于写入 form state 备查）。 */
export function formatKeyFactorAnalysis(result: KeyFactorAiResult): string {
  if (result.causalPairs.length === 0) return 'AI 未识别到任何因果关系';
  const lines: string[] = [`共 ${result.causalPairs.length} 对因果关系（AI 自动填入）：`];
  result.causalPairs.forEach((p, i) => {
    lines.push(`${i + 1}. ${p.cause}  →  ${p.effect}（强度 ${p.strength}）${p.reason ? ` — ${p.reason}` : ''}`);
  });
  return lines.join('\n');
}
