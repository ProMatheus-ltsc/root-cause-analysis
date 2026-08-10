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
 * 问题判定的严格表单字段：先核对"是不是问题"（三标准），再确定"是哪类问题"（三分类），
 * 最后按类型展开专属的界定字段。所有专属字段通过 condition 按类型显示，
 * 不参与引擎必填校验（避免隐藏字段误判），但通过 priority: 'required' 引导用户填写。
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

export function createProblemDefinitionSection(extraFields: FormField[] = []): FormSection {
  return {
    id: 'problemDefinition',
    title: '问题定义',
    description: '先严格界定问题：对照三标准判定是否是真问题，再确定问题类型，最后按类型明确问题细节。（标题与一句话陈述在 4W2H 分析完成后整理）',
    fields: [
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
 * 问题鉴别区（4W2H · IS/IS NOT）：先用强制必填的 4W2H 界定"现实是什么"，
 * 再明确"目标"，系统自动拼接为"标准问题陈述"——因为问题 = 目标 − 现实（二者差距）。
 * 每项描述都要求有数据、数据来源可靠、可量化；"问题不是什么"自检排除
 * 判断/单纯事实/情绪/原因/解决方案/希望等误区。
 */
export function createProblemIdentificationSection(): FormSection {
  return {
    id: 'problemIdentification',
    title: '问题鉴别（4W2H · IS/IS NOT）',
    description:
      '问题 = 目标 − 现实（目标与现实之间的差距）。4W2H 六个维度为必填，用来界定"现实是什么"：描述须有数据、来源可靠、可量化；再填写目标状态，系统将自动拼接成标准问题陈述。',
    collapsedByDefault: true,
    fields: [
      // —— 4W2H 强制维度（界定现实：已知事实）——
      {
        id: 'isWhat',
        label: 'what —— 究竟是什么？',
        type: 'textarea',
        required: true,
        hint: '问题现象的具体内容是什么？描述须有数据、来源可靠、可量化。',
        placeholder: '究竟是什么问题？具体现象是什么？',
      },
      {
        id: 'isWho',
        label: 'who —— 究竟是谁？',
        type: 'textarea',
        required: true,
        hint: '涉及哪些主体/对象？',
        placeholder: '究竟是谁遇到/涉及这个问题？用户、角色、团队、系统…',
      },
      {
        id: 'isWhen',
        label: 'when —— 到底在何时？',
        type: 'textarea',
        required: true,
        hint: '明确时间点、持续多久、发生频率。',
        placeholder: '到底在何时发生？经过多久？频率如何？',
      },
      {
        id: 'isWhere',
        label: 'where —— 发生在哪里？',
        type: 'textarea',
        required: true,
        hint: '明确位置/环节/系统。',
        placeholder: '发生在哪里？出现在什么位置/环节/系统中？',
      },
      {
        id: 'isHow',
        label: 'how —— 如何发生？',
        type: 'textarea',
        required: true,
        hint: '描述发生过程/方式/链路。',
        placeholder: '如何发生？经过什么步骤、流程、链路？',
      },
      {
        id: 'isExtent',
        label: 'how many —— 有多少？',
        type: 'textarea',
        required: true,
        hint: '量化影响：数量/比例；全面还是局部？影响在扩大吗？',
        placeholder: '有多少？全面还是局部？影响在扩大吗？',
      },
      // —— IS / IS NOT 排除侧（推荐）——
      { id: 'isNotWhat', label: 'what —— 不是什么对象（排除）', type: 'textarea', priority: 'recommended', placeholder: '哪些相似对象 / 场景 / 模块没有出现？' },
      { id: 'isNotWho', label: 'who —— 不是谁（排除主体）', type: 'textarea', priority: 'recommended', placeholder: '哪些相似主体没有出现该问题？' },
      { id: 'isNotWhen', label: 'when —— 何时不发生', type: 'textarea', priority: 'recommended', placeholder: '哪些时间段没有出现该问题？' },
      { id: 'isNotWhere', label: 'where —— 何地 / 哪个环节不发生', type: 'textarea', priority: 'recommended', placeholder: '哪些环节 / 地点 / 系统没有出现？' },
      { id: 'isNotHow', label: 'how —— 不是这样发生的（对比）', type: 'textarea', priority: 'recommended', placeholder: '正常情况下同样的步骤 / 流程是怎样的？关键差别在哪？' },
      { id: 'isNotExtent', label: 'how many —— 影响不大的范围', type: 'textarea', priority: 'recommended', placeholder: '哪些范围内影响很小或完全没有？' },
      // —— 目标（问题 = 目标 − 现实）——
      {
        id: 'gapTarget',
        label: '目标 / 期望状态',
        type: 'textarea',
        required: true,
        hint: '问题 = 目标 − 现实。明确"应该达到什么状态"，目标尽量可量化。',
        placeholder: '应该达到什么状态？目标是什么（尽量量化）？',
      },
      // —— 标准问题陈述（自动拼接）——
      {
        id: 'generatedProblemStatement',
        label: '标准问题陈述（自动生成）',
        type: 'text',
        computed: {
          dependsOn: ['isWhat', 'isWho', 'isWhen', 'isWhere', 'isHow', 'isExtent', 'gapTarget'],
          formula: (values: Record<string, unknown>) => {
            const s = (id: string) => (typeof values[id] === 'string' ? (values[id] as string).trim() : '');
            const what = s('isWhat');
            const who = s('isWho');
            const when = s('isWhen');
            const where = s('isWhere');
            const how = s('isHow');
            const extent = s('isExtent');
            const target = s('gapTarget');
            const seg: string[] = [];
            if (who) seg.push(`对象：${who}`);
            if (what) seg.push(`现象：${what}`);
            if (when) seg.push(`时间：${when}`);
            if (where) seg.push(`位置：${where}`);
            if (how) seg.push(`过程：${how}`);
            if (extent) seg.push(`规模：${extent}`);
            if (seg.length === 0) return '（填写 4W2H 后自动生成）';
            let out = `现实（已知事实）：${seg.join('；')}。`;
            out += target ? `目标：${target}。` : '目标未填写。';
            out += '问题 = 目标 − 现实，二者差距即待分析的问题。';
            return out;
          },
        },
      },
      // —— 问题不是什么（集中判断）——
      {
        id: 'isNotStatement',
        label: '问题不是什么（一句话排除判断）',
        type: 'textarea',
        priority: 'recommended',
        hint: '问题是对客观事实的描述，而不是一种判断。明确写下"这个问题不是……"来排除模糊与主观表述。',
        placeholder: '例如"这不是体验不好（主观判断），而是支付流程第 3 步超时率 12%（客观事实）"',
      },
      {
        id: 'notJudgmentCheck',
        label: '问题不是什么——误区自检',
        type: 'checkbox',
        hint: '问题不是一种判断，也不仅仅是事实罗列；问题 = 目标 − 现实。对照误区逐项排除：',
        options: [
          { value: 'notJudgment', label: '不是主观判断 / 评价（如"体验很差""效率低下"）——需改写为可验证的事实描述' },
          { value: 'notJustFact', label: '不仅仅是事实罗列——"服务器重启了 5 次"只是事实，加上"目标是不中断服务"才构成问题' },
          { value: 'notFeeling', label: '不是情绪感受（如"我觉得很焦虑""大家都抱怨"）——情绪不能作为问题定义' },
          { value: 'notCause', label: '不是原因 / 归因（如"因为团队不重视""系统老旧"）——归因应留到分析阶段' },
          { value: 'notSolution', label: '不是解决方案 / 对策（如"应该加个按钮""按时解决的办法是……"）——先定义问题，再谈解法' },
          { value: 'notHope', label: '不是希望 / 愿望（如"我希望它更好"）——希望是期望，不等于问题本身' },
        ],
      },
      // —— 描述质量自检 ——
      {
        id: 'factCheck',
        label: '描述自检',
        type: 'checkbox',
        options: [
          { value: 'hasData', label: '每条描述都有数据支撑（数量/比例/时间/频次）' },
          { value: 'dataReliable', label: '数据来源可靠（系统/日志/一手记录，而非道听途说）' },
          { value: 'quantifiable', label: '描述可量化、可验证（不是"大概/差不多"）' },
        ],
      },
    ],
  };
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
      { id: 'rootCauseSummary', label: '根因总结', type: 'textarea', required: true, placeholder: '用一句话概括最终确定的根本原因' },
      { id: 'rootCauseType', label: '根因类型分类', type: 'radio', options: ROOT_CAUSE_TYPE_OPTIONS },
      {
        id: 'symptomRootCauseCheck',
        label: '症状 ≠ 根因 自检',
        type: 'checkbox',
        hint: '对策必须针对根因而非症状——症状是表现，根因才是真正可以消除的源头',
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
        hint: '多根因 / 多措施场景下确保覆盖完整且不重叠',
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
 * 对策实施区（repeatable）：把根因 → 对策 → 验证的闭环显式化为可执行任务列表。
 * 每条措施独立一条，含措施 / 责任人 / 截止日期 / 状态 / 验证方式。
 */
export function createActionSection(): FormSection {
  return {
    id: 'actionItems',
    title: '对策实施与验证',
    description: '把根因转成可执行任务，每条措施独立跟踪状态。至少列一条措施。',
    minEntries: 1,
    repeatable: true,
    repeatLabel: '措施 {n}',
    fields: [
      { id: 'measure', label: '具体措施', type: 'textarea', required: true, placeholder: '要做什么？怎么做？尽量具体可执行' },
      { id: 'owner', label: '责任人', type: 'text', placeholder: '谁负责推动落实？' },
      { id: 'dueDate', label: '截止日期', type: 'date' },
      { id: 'verification', label: '验证方式', type: 'textarea', placeholder: '如何确认该措施已生效？观察什么指标 / 现象？' },
      {
        id: 'status',
        label: '状态',
        type: 'radio',
        options: [
          { value: 'pending', label: '待实施' },
          { value: 'inProgress', label: '进行中' },
          { value: 'done', label: '已完成' },
          { value: 'ineffective', label: '已实施但未生效' },
        ],
      },
    ],
  };
}
