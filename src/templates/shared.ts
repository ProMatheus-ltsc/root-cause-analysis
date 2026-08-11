/**
 * 多个模板共用的字段常量与分区工厂函数。5Why / 鱼骨图 / 技术故障共享
 * "问题定义" 基础字段与 "根因结论" 分区；所有模板共享 "问题鉴别" 前置区。
 */
import type { FormField, FormSection } from '../types';

export const DISCOVERY_METHOD_OPTIONS = [
  { value: 'active', label: '主动发现' },
  { value: 'passive', label: '被动反馈' },
  { value: 'monitor', label: '监控告警' },
  { value: 'complaint', label: '用户投诉' },
  { value: 'other', label: '其他' },
];

export const IMPACT_SCOPE_OPTIONS = [
  { value: 'personal', label: '个人' },
  { value: 'team', label: '团队' },
  { value: 'department', label: '部门' },
  { value: 'company', label: '公司' },
  { value: 'customer', label: '客户' },
];

export const SEVERITY_OPTIONS = [
  { value: 'P0', label: 'P0 致命' },
  { value: 'P1', label: 'P1 严重' },
  { value: 'P2', label: 'P2 一般' },
  { value: 'P3', label: 'P3 轻微' },
];

export const ROOT_CAUSE_TYPE_OPTIONS = [
  { value: 'process', label: '流程缺陷' },
  { value: 'technical', label: '技术问题' },
  { value: 'human', label: '人为失误' },
  { value: 'design', label: '设计缺陷' },
  { value: 'external', label: '外部因素' },
  { value: 'resource', label: '资源不足' },
  { value: 'communication', label: '沟通问题' },
  { value: 'other', label: '其他' },
];

/**
 * 问题判定标准：对照"是不是问题"的三条定义逐项核对。
 * 若三项均不符合，说明问题尚未界定清楚，应回到描述本身。
 */
export const PROBLEM_CRITERIA_OPTIONS = [
  { value: 'deviation', label: '与标准/规范存在偏差（任何偏离标准的东西）' },
  { value: 'gap', label: '实际状况与期望状况之间存在差距' },
  { value: 'unmetNeed', label: '客户/用户需求未得到满足' },
];

/**
 * 问题分类：不同类型决定分析重心与对策方向。
 * - restore：现状已偏离，需要恢复原状
 * - prevention：尚未发生，但存在隐患，需要预防
 * - ideal：现状正常，追求更高目标
 */
export const PROBLEM_TYPE_OPTIONS = [
  { value: 'restore', label: '恢复原状型（现状偏离标准/期望，需要恢复）' },
  { value: 'prevention', label: '预防隐患型（尚未发生，但存在隐患需要预防）' },
  { value: 'ideal', label: '追求理想型（现状正常，但追求更高目标）' },
];

/**
 * 4W2H 维度选项（带引导提示词）：表格填写用。
 */
export const W2H_OPTIONS = [
  { value: 'what', label: 'what —— 究竟是什么？' },
  { value: 'who', label: 'who —— 究竟是谁？' },
  { value: 'when', label: 'when —— 到底在何时？（持续多久？频率？）' },
  { value: 'where', label: 'where —— 发生在哪里？（什么位置/环节？）' },
  { value: 'how', label: 'how —— 如何发生？（过程/方式/链路）' },
  { value: 'howMany', label: 'how many —— 有多少？（多少？全面/局部？扩大？）' },
];

/**
 * 问题判定的严格表单字段：先核对"是不是问题"（三标准），再确定"是哪类问题"（三分类），
 * 同时勾选"问题不是什么"误区自检，最后按类型展开专属的界定字段。
 * 所有专属字段通过 condition 按类型显示，不参与引擎必填校验（避免隐藏字段误判），
 * 但通过 priority: 'required' 引导用户填写。
 */
export function createProblemCriteriaFields(): FormField[] {
  return [
    {
      id: 'problemCriteria',
      label: '问题判定（对照标准，勾选所有符合项）',
      type: 'checkbox',
      required: true,
      hint: '三条标准都符合才算真正的问题。如果都不符合，说明问题还没界定清楚。',
      options: PROBLEM_CRITERIA_OPTIONS,
    },
    {
      id: 'problemType',
      label: '问题分类（决定分析方向与对策重点）',
      type: 'radio',
      required: true,
      hint: '恢复原状型重在找到并消除偏差；预防隐患型重在评估风险与触发条件；追求理想型重在明确差距与价值。',
      options: PROBLEM_TYPE_OPTIONS,
    },
    {
      id: 'whatProblemIsNotCheck',
      label: '问题不是什么（勾选即可）',
      type: 'checkbox',
      hint: '问题不是一种判断，也不仅仅是事实罗列；问题 = 目标 − 现实。对照误区逐项确认：',
      options: [
        { value: 'notJudgment', label: '不是主观判断 / 评价（如"体验很差"）——需改写为可验证的事实描述' },
        { value: 'notJustFact', label: '不仅仅是事实罗列——"重启了 5 次"只是事实，加上"目标是不中断服务"才构成问题' },
        { value: 'notFeeling', label: '不是情绪感受（如"我觉得很焦虑"）——情绪不能作为问题定义' },
        { value: 'notCause', label: '不是原因 / 归因（如"因为团队不重视"）——归因应留到分析阶段' },
        { value: 'notSolution', label: '不是解决方案 / 对策（如"应该加个按钮"）——先定义问题，再谈解法' },
        { value: 'notHope', label: '不是希望 / 愿望（如"我希望它更好"）——希望是期望，不等于问题本身' },
      ],
    },
    // 恢复原状型专属界定
    {
      id: 'currentState',
      label: '当前实际状况',
      type: 'textarea',
      priority: 'required',
      condition: { dependsOn: 'problemType', showWhen: 'restore' },
      placeholder: '现在实际是什么样的？尽量具体、可量化…',
    },
    {
      id: 'expectedState',
      label: '标准 / 期望状况',
      type: 'textarea',
      priority: 'required',
      condition: { dependsOn: 'problemType', showWhen: 'restore' },
      placeholder: '标准或期望应该是什么样的？依据是什么（规范/目标/承诺）？',
    },
    {
      id: 'deviationDetail',
      label: '偏差的具体表现',
      type: 'textarea',
      priority: 'required',
      condition: { dependsOn: 'problemType', showWhen: 'restore' },
      placeholder: '偏差在哪里：差多少、持续多久、涉及哪些对象？',
    },
    // 预防隐患型专属界定
    {
      id: 'riskFactor',
      label: '潜在隐患 / 风险因素',
      type: 'textarea',
      priority: 'required',
      condition: { dependsOn: 'problemType', showWhen: 'prevention' },
      placeholder: '存在什么隐患？为什么你认为它可能发生？',
    },
    {
      id: 'riskTrigger',
      label: '可能的触发条件',
      type: 'textarea',
      priority: 'required',
      condition: { dependsOn: 'problemType', showWhen: 'prevention' },
      placeholder: '什么情况下隐患会被触发？发生的概率如何？',
    },
    {
      id: 'riskConsequence',
      label: '若发生带来的后果',
      type: 'textarea',
      priority: 'required',
      condition: { dependsOn: 'problemType', showWhen: 'prevention' },
      placeholder: '一旦发生会造成什么损失/影响？为什么现在必须预防？',
    },
    // 追求理想型专属界定
    {
      id: 'currentLevel',
      label: '当前水平',
      type: 'textarea',
      priority: 'required',
      condition: { dependsOn: 'problemType', showWhen: 'ideal' },
      placeholder: '现在做到什么程度了？',
    },
    {
      id: 'targetLevel',
      label: '理想 / 目标水平',
      type: 'textarea',
      priority: 'required',
      condition: { dependsOn: 'problemType', showWhen: 'ideal' },
      placeholder: '希望达到什么程度？目标是否可量化？',
    },
    {
      id: 'gapValue',
      label: '差距的价值与意义',
      type: 'textarea',
      priority: 'required',
      condition: { dependsOn: 'problemType', showWhen: 'ideal' },
      placeholder: '为什么要追求这个目标？达成后带来什么价值？',
    },
  ];
}

/**
 * 4W2H 分析相关字段组：表格 + 目标 + 自动拼接标准问题陈述 + 数据质量自检。
 * 供 createProblemDefinitionSection 与自定义问题定义区的模板复用。
 */
/**
 * 标准问题陈述拼接（纯函数）：供 computed 字段与问题摘要卡片复用。
 * 4W2H 各维度为短语，自动拼成自然语句；空维度跳过。
 */
export function buildGeneratedProblemStatement(values: Record<string, unknown>): string {
  const rows = Array.isArray(values['w2hTable']) ? (values['w2hTable'] as Array<Record<string, unknown>>) : [];
  const dim = (id: string) => {
    const row = rows.find((r) => r.dimension === id);
    return typeof row?.description === 'string' ? (row.description as string).trim() : '';
  };
  const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const who = dim('who');
  const what = dim('what');
  const when = dim('when');
  const where = dim('where');
  const how = dim('how');
  const extent = dim('howMany');
  const target = s(values['gapTarget']);

  if (!who && !what && !when && !where && !how && !extent) return '（填写 4W2H 表格后自动生成）';

  const lead: string[] = [];
  if (who) lead.push(who);
  if (when) lead.push(`自${when}起`);
  if (where) lead.push(`在${where}中`);
  let sentence = lead.join('');
  if (what) sentence += `出现「${what}」`;
  if (how) sentence += `，其过程为${how}`;
  if (extent) sentence += `，影响${extent}`;
  sentence += '。';
  if (target) {
    sentence += `目标为${target}，现状与目标存在差距，二者之差即待分析的问题。`;
  } else {
    sentence += '目标未填写，请补充以界定差距。';
  }
  return sentence;
}

export function createW2hAnalysisFields(): FormField[] {
  return [
    {
      id: 'w2hTable',
      label: '4W2H 全面分析（必填）',
      type: 'table',
      hint: '每个维度填写"短语"即可（名词短语或短分句，如"广分物理和产品部""近两年""乐力PPT、九年级讲义"），系统会自动拼接成通顺的问题陈述。请勿填写完整长句，否则拼接会僵硬。描述须有数据、来源可靠、可量化。',
      validation: { min: 6 },
      defaultValue: W2H_OPTIONS.map((o) => ({ dimension: o.value, description: '' })),
      tableColumns: [
        { id: 'dimension', label: '维度', type: 'select', options: W2H_OPTIONS },
        { id: 'description', label: '短语描述（如：广分物理和产品部 / 近两年 / 乐力PPT、九年级讲义）', type: 'text', placeholder: '填短语，系统自动拼接…' },
      ],
    },
    {
      id: 'gapTarget',
      label: '目标 / 期望状态',
      type: 'textarea',
      required: true,
      hint: '问题 = 目标 − 现实。明确"应该达到什么状态"，目标尽量可量化。',
      placeholder: '应该达到什么状态？目标是什么（尽量量化）？',
    },
    {
      id: 'generatedProblemStatement',
      label: '标准问题陈述（自动生成）',
      type: 'text',
      computed: {
        dependsOn: ['w2hTable', 'gapTarget'],
        formula: (values: Record<string, unknown>) => buildGeneratedProblemStatement(values),
      },
    },
    {
      id: 'factCheck',
      label: '描述自检（数据质量）',
      type: 'checkbox',
      options: [
        { value: 'hasData', label: '4W2H 每条描述都有数据支撑（数量/比例/时间/频次）' },
        { value: 'dataReliable', label: '数据来源可靠（系统/日志/一手记录，而非道听途说）' },
        { value: 'quantifiable', label: '描述可量化、可验证（不是"大概/差不多"）' },
      ],
    },
  ];
}

export function createProblemDefinitionSection(extraFields: FormField[] = []): FormSection {
  return {
    id: 'problemDefinition',
    title: '问题定义与鉴别',
    description:
      '先以 4W2H 表格全面分析"现实是什么"（必填，须有数据、来源可靠、可量化），再进行问题判定与分类，最后明确目标（问题 = 目标 − 现实），系统自动拼接标准问题陈述。',
    fields: [
      ...createW2hAnalysisFields(),
      ...createProblemCriteriaFields(),
      { id: 'occurredAt', label: '发生时间', type: 'date', defaultValue: 'auto_today' },
      { id: 'discoveryMethod', label: '发现方式', type: 'radio', options: DISCOVERY_METHOD_OPTIONS },
      { id: 'impactScope', label: '影响范围', type: 'radio', options: IMPACT_SCOPE_OPTIONS },
      { id: 'severity', label: '严重程度', type: 'radio', options: SEVERITY_OPTIONS },
      { id: 'symptom', label: '问题现象描述', type: 'textarea', required: true, placeholder: '补充问题陈述的细节：发生频率、量化数据、关键证据等…' },
      ...extraFields,
    ],
  };
}

/**
 * 原因头脑风暴区（repeatable）：确定问题后、进入分析方法前，先穷尽所有可能原因。
 * 发散阶段：至少列出 15 个候选原因（先不求对错、不筛选），作为后续确认根本原因的输入清单。
 */
export function createBrainstormSection(): FormSection {
  return {
    id: 'brainstorm',
    title: '原因头脑风暴',
    description:
      '问题确定后，先穷尽所有可能导致问题的原因（发散思维）：至少列出 15 个。此阶段不求对错、不筛选、不评价，全部写下来；后续分析方法将基于此清单确认根本原因。',
    repeatable: true,
    repeatLabel: '原因 {n}',
    minEntries: 15,
    fields: [
      {
        id: 'cause',
        label: '可能的原因',
        type: 'textarea',
        required: true,
        placeholder: '任何可能导致问题的原因，先写下来（不必判断对错）…',
      },
      {
        id: 'evidence',
        label: '相关证据 / 线索（可选）',
        type: 'textarea',
        placeholder: '支持该原因的证据、观察、数据或线索…',
      },
    ],
  };
}

/**
 * 问题整理区：标题与一句话陈述是 4W2H 全面分析之后的"整理输出"，
 * 而不是开头的随手描述。放在鉴别区之后，引导用户先分析、再提炼。
 */
export function createProblemSummarySection(): FormSection {
  return {
    id: 'problemSummary',
    title: '问题整理',
    description: '先完成上方 4W2H 全面分析，再基于分析结果（标准问题陈述）整理出标题与一句话陈述。',
    fields: [
      {
        id: 'title',
        label: '问题标题',
        type: 'text',
        required: true,
        hint: '基于 4W2H 分析提炼的简洁标题',
        placeholder: '例如：每日 22:00 批处理任务超时，影响次日账单生成',
      },
      {
        id: 'problemStatement',
        label: '一句话问题陈述',
        type: 'textarea',
        required: true,
        hint: '参考上方"标准问题陈述（自动生成）"优化整理：问题 = 目标 − 现实，客观事实、不含原因猜测与解决方案。',
        placeholder: '把标准问题陈述整理成一句话，例如"账单系统每日 22:00 批处理超时、影响 30% 用户次日账单，目标应在 22:00 前完成，现状与目标存在差距"',
      },
    ],
  };
}

/**
 * 要因分析法（DEMATEL + 帕累托）：用于复杂、非量化问题。
 * 因素间关系强度标度：0=无关，1=弱（单向弱影响），2=中（双向/强单向），4=强（互为强因果）。
 * 中心度 = 行和（影响度 outDegree）+ 列和（被影响度 inDegree），帕累托累计达 80% 的因素为关键根因。
 */
export const RELATION_LEVEL_OPTIONS = [
  { value: 0, label: '0 —— 无影响（两因素无关）' },
  { value: 1, label: '1 —— 弱影响（单向弱关联）' },
  { value: 2, label: '2 —— 中等影响（双向/单向强关联）' },
  { value: 4, label: '4 —— 强影响（互为强因果）' },
];

/** 矩阵最大因子数（用户从头脑风暴清单中筛选 ≤ MAX_FACTORS 个核心因素参与矩阵分析）。 */
export const KEY_FACTOR_MAX = 15;

/** 矩阵列定义：固定 KEY_FACTOR_MAX × KEY_FACTOR_MAX，第 i 行第 j 列 = 因素 i 对因素 j 的影响强度。 */
export function keyFactorMatrixColumns(): { id: string; label: string; placeholder: string }[] {
  return Array.from({ length: KEY_FACTOR_MAX }, (_, j) => ({
    id: `c${j}`,
    label: `→ 因素 ${j + 1}`,
    placeholder: '0/1/2/4',
  }));
}

/** 预生成 8×8 默认零矩阵（用户填写前的样子）。 */
export function buildDefaultKeyFactorMatrix(): Record<string, number>[] {
  return Array.from({ length: KEY_FACTOR_MAX }, () =>
    Object.fromEntries(Array.from({ length: KEY_FACTOR_MAX }, (_, j) => [`c${j}`, 0])),
  );
}

/**
 * 要因分析法核心计算（得分法）：
 * 1. 提取因素列表（repeatable 'factors'）与关系矩阵（table 'matrix'）；
 * 2. 两两比较：因素 i 对 j 有影响（强度 > 0）→ i 是"因"、j 是"果"；
 *    因 -1 / 果 +1 累计得分 score = 果次数(inCount) − 因次数(outCount)；
 * 3. 分类：得分最低 → 根因（最源头）；得分最高 → 表因（最表象）；接近 0（-2~2）→ 过因（中间传导）；
 * 4. 补充帕累托视角：按中心度（强度加权）降序累计 ≥ 80% 标为关键因素。
 */
export type FactorRole = 'root' | 'transit' | 'surface';

export interface KeyFactorResult {
  index: number;
  name: string;
  /** 作为"因"的关系数（影响其他因素） */
  outCount: number;
  /** 作为"果"的关系数（被其他因素影响） */
  inCount: number;
  /** 得分 = inCount − outCount（因 −1 / 果 +1） */
  score: number;
  /** 根因（score 最低）/ 过因（接近 0）/ 表因（score 最高） */
  role: FactorRole;
  roleLabel: string;
  /** 影响度（强度加权行和） */
  outDegree: number;
  /** 被影响度（强度加权列和） */
  inDegree: number;
  /** 中心度 = outDegree + inDegree（帕累托补充视角） */
  centrality: number;
  cumulativePercent: number;
  isKey: boolean;
}

export const KEY_FACTOR_THRESHOLD = 0.8;
/** score < CAUSE_SCORE_ROOT → 根因；score > CAUSE_SCORE_SURFACE → 表因；之间 → 过因 */
export const CAUSE_SCORE_ROOT = -2;
export const CAUSE_SCORE_SURFACE = 2;

export function computeKeyFactors(values: Record<string, unknown>): KeyFactorResult[] {
  const rawFactors = Array.isArray(values['factors']) ? (values['factors'] as Array<Record<string, unknown>>) : [];
  const factors = rawFactors
    .slice(0, KEY_FACTOR_MAX)
    .map((f, i) => ({ index: i, name: typeof f.name === 'string' ? f.name.trim() : '' }))
    .filter((f) => f.name);

  const rawMatrix = Array.isArray(values['matrix']) ? (values['matrix'] as Array<Record<string, unknown>>) : [];
  const matrix: number[][] = rawMatrix.slice(0, KEY_FACTOR_MAX).map((row) =>
    Array.from({ length: KEY_FACTOR_MAX }, (_, j) => {
      const v = row[`c${j}`];
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) ? n : 0;
    }),
  );

  const n = factors.length;
  const outDegree = Array.from({ length: n }, () => 0);
  const inDegree = Array.from({ length: n }, () => 0);
  const outCount = Array.from({ length: n }, () => 0);
  const inCount = Array.from({ length: n }, () => 0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const v = matrix[i]?.[j] ?? 0;
      if (v > 0) {
        outDegree[i] += v;
        outCount[i] += 1; // i 是 j 的因
        inDegree[j] += v;
        inCount[j] += 1; // j 是 i 的果
      }
    }
  }

  const rows: KeyFactorResult[] = factors.map((f, i) => {
    const score = inCount[i] - outCount[i];
    let role: FactorRole;
    let roleLabel: string;
    if (score > CAUSE_SCORE_SURFACE) {
      role = 'surface';
      roleLabel = '表因';
    } else if (score < CAUSE_SCORE_ROOT) {
      role = 'root';
      roleLabel = '根因';
    } else {
      role = 'transit';
      roleLabel = '过因';
    }
    return {
      index: f.index,
      name: f.name,
      outCount: outCount[i],
      inCount: inCount[i],
      score,
      role,
      roleLabel,
      outDegree: outDegree[i],
      inDegree: inDegree[i],
      centrality: outDegree[i] + inDegree[i],
      cumulativePercent: 0,
      isKey: false,
    };
  });

  // 帕累托补充：按中心度（强度加权）降序累计 ≥ 80% 标为关键
  const sorted = [...rows].sort((a, b) => b.centrality - a.centrality);
  const total = sorted.reduce((s, r) => s + r.centrality, 0);
  if (total > 0) {
    let cum = 0;
    let hasKey = false;
    for (const r of sorted) {
      cum += r.centrality;
      r.cumulativePercent = +(cum / total).toFixed(4);
      r.isKey = r.cumulativePercent <= KEY_FACTOR_THRESHOLD;
      if (r.isKey) hasKey = true;
    }
    if (!hasKey && sorted.length > 0) {
      sorted[0].isKey = true;
    }
  }
  return rows;
}

/**
 * 得分分类结果文本：按得分升序（根因在前）列出，并汇总根因/过因/表因。
 */
export function buildCauseScoreText(results: KeyFactorResult[]): string {
  if (results.length === 0) return '（先填写因素清单与关系矩阵后自动生成）';
  const sorted = [...results].sort((a, b) => a.score - b.score);
  const lines = sorted.map(
    (r, i) => `${i + 1}. ${r.name}：得分 ${r.score}（作为因 ${r.outCount} 次 / 作为果 ${r.inCount} 次）→ ${r.roleLabel}`,
  );
  const root = results.filter((r) => r.role === 'root').map((r) => r.name);
  const transit = results.filter((r) => r.role === 'transit').map((r) => r.name);
  const surface = results.filter((r) => r.role === 'surface').map((r) => r.name);
  const summary: string[] = [];
  if (root.length) summary.push(`根因（得分最低，最源头）：${root.join('、')}`);
  if (transit.length) summary.push(`过因（得分接近 0，中间传导）：${transit.join('、')}`);
  if (surface.length) summary.push(`表因（得分最高，最表象）：${surface.join('、')}`);
  // 相对视角：无论固定阈值是否区分得出，都给出"最源头/最表象"的定位，保证可操作
  const minRow = sorted[0];
  const maxRow = sorted[sorted.length - 1];
  summary.push(`相对视角：得分最低（最源头）→ ${minRow.name}；得分最高（最表象）→ ${maxRow.name}`);
  if (root.length === 0 && surface.length === 0) {
    summary.push('注：当前各因素得分均落在过因区间（-2~2），可结合相对视角与证据人工收敛根因。');
  }
  return lines.join('\n') + `\n\n${summary.join('\n')}`;
}

/**
 * 帕累托补充视角文本：按中心度（强度加权）降序排列，标注累计贡献达 80% 的关键因素。
 */
export function buildKeyFactorRankingText(results: KeyFactorResult[]): string {
  if (results.length === 0) return '（先填写因素清单与关系矩阵后自动生成）';
  const sorted = [...results].sort((a, b) => b.centrality - a.centrality);
  const lines = sorted.map(
    (r, i) => `第 ${i + 1} 名：${r.name}（中心度 ${r.centrality}，累计贡献 ${(r.cumulativePercent * 100).toFixed(1)}%）${r.isKey ? '  ★ 关键' : ''}`,
  );
  const keyNames = sorted.filter((r) => r.isKey).map((r) => r.name);
  const summary = keyNames.length
    ? `\n\n帕累托关键因素（累计贡献达 ${(KEY_FACTOR_THRESHOLD * 100).toFixed(0)}%，80/20 视角）：\n${keyNames.map((n) => `· ${n}`).join('\n')}`
    : '';
  return lines.join('\n') + summary;
}

/**
 * 根因结论区：症状/根因区分 + MECE 自检 + 验证方式。
 * 强调"对策必须针对根因而非症状"，以及多根因/多措施下的 MECE（相互独立、完全穷尽）。
 */
export function createRemedySection(): FormSection {
  return {
    id: 'remedy',
    title: '根因结论',
    fields: [
      {
        id: 'confirmedCause',
        label: '从头脑风暴清单中确认的原因',
        type: 'textarea',
        hint: '对照问题卡片中的"原因头脑风暴"候选清单，结合本方法分析，收敛出最可能的 1-3 个原因（可引用候选清单中的原因编号/描述）。',
        placeholder: '例如"① 每日 22:00 上游依赖未就绪（清单第 3 条）——经 5 Why 追问确认"',
      },
      { id: 'rootCauseSummary', label: '根因总结', type: 'textarea', required: true, placeholder: '用一句话概括最终确定的根本原因' },
      { id: 'rootCauseType', label: '根因类型分类', type: 'radio', options: ROOT_CAUSE_TYPE_OPTIONS },
      {
        id: 'symptomRootCauseCheck',
        label: '症状 ≠ 根因 自检',
        type: 'checkbox',
        priority: 'recommended',
        hint: '⭐ 推荐完成——对策必须针对根因而非症状，症状是表现，根因才是真正可以消除的源头。跳过此项可能导致问题反复出现。',
        options: [
          { value: 'identifiedSymptom', label: '已明确区分"症状"（表面现象）与"根因"（真正源头）' },
          { value: 'rootCauseEliminable', label: '此根因被消除后，症状会随之消失' },
          { value: 'notTreatingSymptom', label: '所选对策不是只治表面（否则根因下次会复发）' },
        ],
      },
      {
        id: 'meceCheck',
        label: 'MECE 自检（相互独立、完全穷尽）',
        type: 'checkbox',
        priority: 'recommended',
        hint: '⭐ 推荐完成——多根因/多措施场景下确保覆盖完整且不重叠，避免遗漏或重复投入。',
        options: [
          { value: 'exclusive', label: '各项根因 / 措施之间相互独立（不重叠、不互为因果）' },
          { value: 'exhaustive', label: '已穷尽所有可能的根因（无明显遗漏）' },
        ],
      },
      {
        id: 'verificationPlan',
        label: '验证方式（怎么确认对策有效）',
        type: 'textarea',
        placeholder: '用什么指标 / 观察 / 数据来判定根因已被消除、对策已生效？例如"上线后连续 7 天监控指标 X 维持 ≤ 阈值 Y"',
      },
    ],
  };
}
