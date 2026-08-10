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
    description: '先严格界定问题：对照三标准判定是否是真问题，再确定问题类型，最后按类型明确问题细节。',
    fields: [
      { id: 'title', label: '问题标题', type: 'text', required: true },
      {
        id: 'problemStatement',
        label: '一句话问题陈述',
        type: 'textarea',
        required: true,
        hint: '鉴别问题的第一原则：先界定问题，再寻找原因。陈述中不包含原因猜测与解决方案。',
        placeholder: '用一句话客观描述：什么对象、在什么条件下、发生了什么。例如"每日 22:00 批处理任务超时未完成，连续 3 天，影响次日账单生成"',
      },
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
 * 问题鉴别区（5W2H IS/IS NOT）：用"是什么 vs 不是什么"逐维界定问题边界。
 * 5W2H = who/what/when/where/how/how much，是经典问题描述框架，
 * 配合 IS/IS NOT 对比可以同时暴露"是什么"与"不是什么"的关键差异，
 * 排除无关因素、缩小根因搜索范围。
 */
export function createProblemIdentificationSection(): FormSection {
  return {
    id: 'problemIdentification',
    title: '问题鉴别（5W2H · IS/IS NOT）',
    description:
      '按 5W2H 六个维度逐一对照"是什么 vs 不是什么"。对比是暴露关键差异的核心手段——单边描述往往遗漏真相。建议至少完成 who/what/when/how much 四个维度。',
    collapsedByDefault: true,
    fields: [
      // —— 5W2H 维度 ——
      { id: 'isWho', label: 'who —— 谁 / 哪个主体', type: 'textarea', priority: 'recommended', placeholder: '问题涉及谁？哪个用户/角色/团队/系统？' },
      { id: 'isNotWho', label: 'who —— 不是谁（排除主体）', type: 'textarea', priority: 'recommended', placeholder: '哪些相似主体没有出现该问题？' },
      { id: 'isWhat', label: 'what —— 什么对象 / 什么内容', type: 'textarea', priority: 'recommended', placeholder: '问题具体发生在什么对象 / 场景 / 模块上？' },
      { id: 'isNotWhat', label: 'what —— 不是什么对象（排除）', type: 'textarea', priority: 'recommended', placeholder: '哪些相似对象 / 场景 / 模块没有出现？' },
      { id: 'isWhen', label: 'when —— 何时发生', type: 'textarea', priority: 'recommended', placeholder: '首次何时出现？最近一次？发生频率与时间规律？' },
      { id: 'isNotWhen', label: 'when —— 何时不发生', type: 'textarea', priority: 'recommended', placeholder: '哪些时间段没有出现该问题？' },
      { id: 'isWhere', label: 'where —— 何地 / 哪个环节', type: 'textarea', priority: 'recommended', placeholder: '在哪个环节 / 地点 / 系统中出现？' },
      { id: 'isNotWhere', label: 'where —— 何地 / 哪个环节不发生', type: 'textarea', priority: 'recommended', placeholder: '哪些环节 / 地点 / 系统没有出现？' },
      { id: 'isHow', label: 'how —— 如何发生 / 过程 / 方式', type: 'textarea', priority: 'recommended', placeholder: '问题是怎么发生的？经过了什么步骤 / 流程 / 链路？' },
      { id: 'isNotHow', label: 'how —— 不是这样发生的（对比）', type: 'textarea', priority: 'recommended', placeholder: '正常情况下同样的步骤 / 流程是怎样的？关键差别在哪？' },
      { id: 'isExtent', label: 'how much —— 影响程度', type: 'textarea', priority: 'recommended', placeholder: '影响多大：数量 / 比例 / 金额 / 趋势？' },
      { id: 'isNotExtent', label: 'how much —— 影响不大的范围', type: 'textarea', priority: 'recommended', placeholder: '哪些范围内影响很小或完全没有？' },
      // —— 描述质量自检 ——
      {
        id: 'factCheck',
        label: '描述自检',
        type: 'checkbox',
        options: [
          { value: 'noAssumption', label: '以上描述均为已发生的事实，不含原因猜测' },
          { value: 'verifiable', label: '每条描述都有可验证的依据（数据/日志/观察）' },
          { value: 'noSolutionJump', label: '没有把"解决方案"或"想要的结果"当作"问题定义"' },
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
