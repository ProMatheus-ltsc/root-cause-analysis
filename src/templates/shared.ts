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
 * 要因分析法核心计算（两步走）：
 *
 * ── 第一步：因果定位（得分法）──
 * 把每个因素看成一个"节点"，把矩阵里每一对"i 影响 j"看成一条从 i 指向 j 的边。
 * 统计每个节点：
 *   - outCount：作为"因"的次数（它指向别人的边数）＝它影响了几个因素
 *   - inCount ：作为"果"的次数（别人指向它的边数）＝它被几个因素影响
 * 得分 score = inCount − outCount：
 *   - 分数越【低】→ 影响别人多、被影响少 → 更接近【源头】（根因）
 *   - 分数越【高】→ 被影响多、影响别人少 → 更接近【表象】（表因）
 *   - 接近 0     → 既影响别人也被影响 → 中间传导（过因）
 * 阈值 CAUSE_SCORE_ROOT（-2）与 CAUSE_SCORE_SURFACE（+2）用于划分三档，
 * 数值本身不是绝对值，只是经验分界；阈值分不开时还有"相对视角"兜底（最源头/最表象）。
 *
 * ── 第二步：关键因素（强度加权 + 帕累托）──
 * 前面的得分只看"关系数量"，这里再看"影响强度"：
 *   - outDegree[i] = 第 i 行所有非零值之和（i 对外施加的影响总量）
 *   - inDegree[j]  = 第 j 列所有非零值之和（j 承受的影响总量）
 *   - centrality（中心度）= outDegree + inDegree，衡量"这个因素在因果网络里的总活跃度"。
 * 按中心度降序累加占比，累计达到 80% 之前的所有因素标记为"关键"（帕累托法则：少数的关键因素贡献了大部分影响）。
 */
export type FactorRole = 'root' | 'transit' | 'surface';

export interface KeyFactorResult {
  index: number;
  name: string;
  /** 作为"因"的关系数（影响其他因素） */
  outCount: number;
  /** 作为"果"的关系数（被其他因素影响） */
  inCount: number;
  /** 定位得分 = inCount − outCount（因 −1 / 果 +1 累计） */
  score: number;
  /** 根因（score 最低）/ 过因（接近 0）/ 表因（score 最高） */
  role: FactorRole;
  roleLabel: string;
  /** 影响度（强度加权行和：它对外施加的影响总量） */
  outDegree: number;
  /** 被影响度（强度加权列和：它承受的影响总量） */
  inDegree: number;
  /** 中心度 = outDegree + inDegree（帕累托补充视角用） */
  centrality: number;
  cumulativePercent: number;
  isKey: boolean;
}

export const KEY_FACTOR_THRESHOLD = 0.8;
/** score < CAUSE_SCORE_ROOT → 根因；score > CAUSE_SCORE_SURFACE → 表因；之间 → 过因 */
export const CAUSE_SCORE_ROOT = -2;
export const CAUSE_SCORE_SURFACE = 2;

export function computeKeyFactors(values: Record<string, unknown>): KeyFactorResult[] {
  // ---- 1. 读取并清洗输入：因素清单 + 关系矩阵 ----
  // 表单里 factors 是条目数组（{name, description}），matrix 是行对象数组（{c0..c14}）。
  // 这里统一转成"名称数组 factors" + "二维数字矩阵 matrix"，后续计算只认这两种干净结构。
  const rawFactors = Array.isArray(values['factors']) ? (values['factors'] as Array<Record<string, unknown>>) : [];
  const factors = rawFactors
    .slice(0, KEY_FACTOR_MAX) // 矩阵固定 15×15，超出部分截断（用户侧已限制，这里是双保险）
    .map((f, i) => ({ index: i, name: typeof f.name === 'string' ? f.name.trim() : '' }))
    .filter((f) => f.name); // 过滤掉没填名称的空条目

  const rawMatrix = Array.isArray(values['matrix']) ? (values['matrix'] as Array<Record<string, unknown>>) : [];
  const matrix: number[][] = rawMatrix.slice(0, KEY_FACTOR_MAX).map((row) =>
    // 行对象 {c0: 1, c1: 0, ...} → 数字数组 [1, 0, ...]；
    // Number(v) 把字符串数字（如表单 select 传来的 "2"）也转成数字；非法值统一归 0。
    Array.from({ length: KEY_FACTOR_MAX }, (_, j) => {
      const v = row[`c${j}`];
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) ? n : 0;
    }),
  );

  const n = factors.length;
  // 四种统计量的累计器，下标与因素一一对应
  const outDegree = Array.from({ length: n }, () => 0); // 行和（强度加权，影响总量）
  const inDegree = Array.from({ length: n }, () => 0); // 列和（强度加权，被影响总量）
  const outCount = Array.from({ length: n }, () => 0); // 非零行条目数（影响几个）
  const inCount = Array.from({ length: n }, () => 0); // 非零列条目数（被几个影响）

  // ---- 2. 遍历矩阵上三角/全矩阵，累计四个统计量 ----
  // 对每个非零单元格 matrix[i][j]（i≠j）：
  //   - i 是"因"：它影响 j → outDegree[i] += 值、outCount[i] += 1
  //   - j 是"果"：它被 i 影响 → inDegree[j] += 值、inCount[j] += 1
  // 对角线（i===j）代表"自己影响自己"，无意义，跳过。
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

  // ---- 3. 组装每个因素的定位结果 ----
  const rows: KeyFactorResult[] = factors.map((f, i) => {
    const score = inCount[i] - outCount[i]; // 因 −1 / 果 +1 的净方向
    let role: FactorRole;
    let roleLabel: string;
    // 注意比较方向：score 越大越"表象"（被影响多），越小越"源头"（影响别人多）
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
      cumulativePercent: 0, // 下面第二步再填
      isKey: false,
    };
  });

  // ---- 4. 帕累托标记"关键因素" ----
  // 思路：把中心度最高的因素逐个累加占比，当累计占比第一次超过 80% 时停止，
  // 停止前计入的那些因素就是"关键的少数"（约 20% 的因素贡献了约 80% 的影响）。
  // 为什么用中心度而不是得分？得分衡量"方向"（源头/表象），中心度衡量"总活跃度"，
  // 帕累托要找的是"谁在系统里影响力最大"，所以用强度加权的中心度。
  const sorted = [...rows].sort((a, b) => b.centrality - a.centrality);
  const total = sorted.reduce((s, r) => s + r.centrality, 0);
  if (total > 0) {
    let cum = 0;
    let hasKey = false;
    for (const r of sorted) {
      cum += r.centrality;
      r.cumulativePercent = +(cum / total).toFixed(4); // 累计占比（0~1），保留 4 位小数
      // 注意：累计占比 <= 80% 才标为关键——排序后先累加的自然占比小，
      // 一旦超过 80% 后续因素全部不标，恰好符合"只取头部少数"
      r.isKey = r.cumulativePercent <= KEY_FACTOR_THRESHOLD;
      if (r.isKey) hasKey = true;
    }
    // 兜底：极端情况（如所有中心度都相同导致第一个就超阈值）下至少保底标出第一名，
    // 保证"关键因素"列表永不落空，用户始终有可用的收敛对象。
    if (!hasKey && sorted.length > 0) {
      sorted[0].isKey = true;
    }
  }
  return rows;
}

/**
 * 得分分类结果文本（文本版 fallback，当前未被引用，保留作兼容）：按定位得分升序（最源头在前）列出，并汇总根因/过因/表因。
 */
export function buildCauseScoreText(results: KeyFactorResult[]): string {
  if (results.length === 0) return '（先填写因素清单与关系矩阵后自动生成）';
  const sorted = [...results].sort((a, b) => a.score - b.score);
  const lines = sorted.map(
    (r, i) => `${i + 1}. ${r.name}（影响其他因素 ${r.outCount} 次 / 被其他因素影响 ${r.inCount} 次）→ ${r.roleLabel}`,
  );
  const root = results.filter((r) => r.role === 'root').map((r) => r.name);
  const transit = results.filter((r) => r.role === 'transit').map((r) => r.name);
  const surface = results.filter((r) => r.role === 'surface').map((r) => r.name);
  const summary: string[] = [];
  if (root.length) summary.push(`根因（最源头）：${root.join('、')}`);
  if (transit.length) summary.push(`过因（中间传导）：${transit.join('、')}`);
  if (surface.length) summary.push(`表因（最表象）：${surface.join('、')}`);
  // 相对视角：无论固定阈值是否区分得出，都给出"最源头/最表象"的定位，保证可操作
  const minRow = sorted[0];
  const maxRow = sorted[sorted.length - 1];
  summary.push(`相对视角：最源头 → ${minRow.name}；最表象 → ${maxRow.name}`);
  if (root.length === 0 && surface.length === 0) {
    summary.push('注：当前各因素均处于中间传导区间，可结合相对视角与证据人工收敛根因。');
  }
  return lines.join('\n') + `\n\n${summary.join('\n')}`;
}

/**
 * 得分分类的结构化表格数据（供 FieldRenderer 渲染带颜色表格）：
 * - 单元格背景色按判定（根因/过因/表因）配色，重要性突出
 * - 数字列用等宽字体右对齐便于对比
 */
export interface CauseScoreTableData {
  type: 'causeScoreTable';
  rows: Array<{
    rank: number;
    name: string;
    outCount: number;
    inCount: number;
    score: number;
    role: 'root' | 'transit' | 'surface';
    roleLabel: string;
  }>;
  summary: string[];
}
export function buildCauseScoreTableData(results: KeyFactorResult[]): CauseScoreTableData {
  const sorted = [...results].sort((a, b) => a.score - b.score);
  const root = results.filter((r) => r.role === 'root').map((r) => r.name);
  const transit = results.filter((r) => r.role === 'transit').map((r) => r.name);
  const surface = results.filter((r) => r.role === 'surface').map((r) => r.name);
  const summary: string[] = [];
  if (root.length) summary.push(`根因：${root.join('、')}`);
  if (transit.length) summary.push(`过因：${transit.join('、')}`);
  if (surface.length) summary.push(`表因：${surface.join('、')}`);
  if (sorted.length > 0) {
    summary.push(`相对视角：最源头 → ${sorted[0].name}；最表象 → ${sorted[sorted.length - 1].name}`);
  }
  return {
    type: 'causeScoreTable',
    rows: sorted.map((r, i) => ({
      rank: i + 1,
      name: r.name,
      outCount: r.outCount,
      inCount: r.inCount,
      score: r.score,
      role: r.role as 'root' | 'transit' | 'surface',
      roleLabel: r.roleLabel,
    })),
    summary,
  };
}

/**
 * 关键因素排序文本（文本版 fallback，当前未被引用，保留作兼容）：按影响度（强度加权）降序排列，标注优先关注的关键因素。
 */
export function buildKeyFactorRankingText(results: KeyFactorResult[]): string {
  if (results.length === 0) return '（先填写因素清单与关系矩阵后自动生成）';
  const sorted = [...results].sort((a, b) => b.centrality - a.centrality);
  const lines = sorted.map(
    (r, i) => `第 ${i + 1} 名：${r.name}（影响度 ${r.centrality}，累计占比 ${(r.cumulativePercent * 100).toFixed(1)}%）${r.isKey ? '  ★ 优先关注' : ''}`,
  );
  const keyNames = sorted.filter((r) => r.isKey).map((r) => r.name);
  const summary = keyNames.length
    ? `\n\n优先关注的关键原因（累计影响占比达 ${(KEY_FACTOR_THRESHOLD * 100).toFixed(0)}%，即"关键的少数"）：\n${keyNames.map((n) => `· ${n}`).join('\n')}`
    : '';
  return lines.join('\n') + summary;
}

/**
 * 帕累托中心度排名的结构化表格数据：
 * - 关键因素（累计贡献达 KEY_FACTOR_THRESHOLD）整行高亮琥珀色
 * - 累计贡献单元格用色阶标识贡献度
 */
export interface KeyFactorRankingTableData {
  type: 'keyFactorRankingTable';
  rows: Array<{
    rank: number;
    name: string;
    centrality: number;
    cumulativePercent: number;
    isKey: boolean;
  }>;
  keyNames: string[];
  threshold: number;
}
export function buildKeyFactorRankingTableData(results: KeyFactorResult[]): KeyFactorRankingTableData {
  const sorted = [...results].sort((a, b) => b.centrality - a.centrality);
  const keyNames = sorted.filter((r) => r.isKey).map((r) => r.name);
  return {
    type: 'keyFactorRankingTable',
    rows: sorted.map((r, i) => ({
      rank: i + 1,
      name: r.name,
      centrality: r.centrality,
      cumulativePercent: r.cumulativePercent,
      isKey: r.isKey,
    })),
    keyNames,
    threshold: KEY_FACTOR_THRESHOLD,
  };
}

/**
 * 根因结论区：症状/根因区分 + MECE 自检 + 验证方式。
 * 强调"对策必须针对根因而非症状"，以及多根因/多措施下的 MECE（相互独立、完全穷尽）。
 *
 * options 提供"自动汇总"公式：
 * - confirmedCauseFormula: 汇总前序分析结果（如根因列表）作为根因结论初始值；用户可编辑后不再被覆盖
 * - rootCauseSummaryFormula: 生成一句话根因总结作为初始值
 * - editableFields 标记哪些字段使用 ComputedEditableTextarea（自动汇总+可编辑）
 */
export interface RemedySectionOptions {
  /** 自动汇总到 confirmedCause 的公式，依赖前序字段 ids */
  confirmedCauseFormula?: (values: Record<string, unknown>) => string;
  /** confirmedCause 公式依赖的字段 id 列表（用于 setValue 时机） */
  confirmedCauseDeps?: string[];
  /** 自动汇总到 rootCauseSummary 的公式 */
  rootCauseSummaryFormula?: (values: Record<string, unknown>) => string;
  rootCauseSummaryDeps?: string[];
}

export function createRemedySection(options?: RemedySectionOptions): FormSection {
  const o = options ?? {};
  const useAutoCause = typeof o.confirmedCauseFormula === 'function';
  const useAutoSummary = typeof o.rootCauseSummaryFormula === 'function';
  return {
    id: 'remedy',
    title: '根因结论',
    fields: [
      {
        id: 'confirmedCause',
        label: useAutoCause ? '从候选原因中确认的根因（自动汇总，可编辑修改）' : '从候选原因中确认的根因',
        type: 'textarea',
        hint: '对照问题卡片中的"原因头脑风暴"候选清单，结合本方法分析，收敛出最可能的 1-3 个根因（可引用候选清单中的原因编号/描述）。',
        placeholder: '例如"① 每日 22:00 上游依赖未就绪（清单第 3 条）——综合各维度分析判定为最关键的源头"',
        computed: useAutoCause
          ? {
              dependsOn: o.confirmedCauseDeps ?? [],
              formula: o.confirmedCauseFormula!,
              editable: true,
            }
          : undefined,
      },
      {
        id: 'rootCauseSummary',
        label: useAutoSummary ? '根因总结（自动汇总，可编辑修改）' : '根因总结',
        type: 'textarea',
        required: true,
        placeholder: '用一句话概括最终确定的根本原因',
        computed: useAutoSummary
          ? {
              dependsOn: o.rootCauseSummaryDeps ?? [],
              formula: o.rootCauseSummaryFormula!,
              editable: true,
            }
          : undefined,
      },
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

/**
 * 鱼骨图分析法的"已确认原因"汇总：把六大维度下用户勾选/填写的发现整理成 markdown，
 * 让根因结论处自动展示本方法的所有发现，无需用户手动复制。
 * - 优先汇总维度内 `*Notes` 备注（用户自填的细化发现）
 * - 列出该维度的发现数组（`values[dim.id]` 中的 cause 项）
 * - 最后附上头脑风暴候选中已被分类到该维度的引用（`values.brainstormRefs[catId]`）
 */
export function buildFishboneSummary(values: Record<string, unknown>): string {
  const DIMENSIONS = [
    { id: 'man', label: '人 (Man)' },
    { id: 'machine', label: '机 (Machine)' },
    { id: 'material', label: '料 (Material)' },
    { id: 'method', label: '法 (Method)' },
    { id: 'environment', label: '环 (Environment)' },
    { id: 'measurement', label: '测 (Measurement)' },
  ];
  const refs =
    values.brainstormRefs && typeof values.brainstormRefs === 'object'
      ? (values.brainstormRefs as Record<string, string[]>)
      : {};
  const lines: string[] = [];
  let hasAny = false;
  for (const dim of DIMENSIONS) {
    const notes = typeof values[`${dim.id}Notes`] === 'string' ? (values[`${dim.id}Notes`] as string).trim() : '';
    const findings: string[] = [];
    const dimData = values[dim.id];
    if (Array.isArray(dimData)) {
      for (const item of dimData as Array<Record<string, unknown>>) {
        const cause = typeof item?.cause === 'string' ? item.cause.trim() : '';
        if (cause) findings.push(cause);
      }
    }
    const refCauses = Array.isArray(refs[dim.id]) ? refs[dim.id] : [];
    if (!notes && findings.length === 0 && refCauses.length === 0) continue;
    hasAny = true;
    lines.push(`【${dim.label}】`);
    if (notes) lines.push(notes);
    for (const c of findings) lines.push(`- ${c}`);
    for (const c of refCauses) lines.push(`- (候选) ${c}`);
    lines.push('');
  }
  return hasAny ? lines.join('\n').trimEnd() : '';
}
