/**
 * 技术专题分析（二合一流程）：时间线 + 技术排查 + 5Why 追根因。
 *
 * 面向互联网/系统技术故障的标准定位路径，一条流程走完，无需像复杂问题一样先走"新建问题"向导：
 *   ① 影响面发现（时间线）：从告警/监控/日志发现出发，还原事件经过，梳理影响面
 *   ② 问题定位：结合错误信息/异常堆栈与监控证据，锁定具体问题（一般日志有报错）
 *   ③ 根因分析：针对定位到的问题用 5Why 逐层追问，追溯到代码/配置层面的根因
 *   ④ 根因结论：对策与验证
 *
 * 原"时间线分析法"与"技术故障根因分析"合并为本模板；旧模板保留注册以兼容历史数据，但不再作为新入口。
 */
import type { FormTemplate } from '../types';
import { createRemedySection, IMPACT_SCOPE_OPTIONS, SEVERITY_OPTIONS } from './shared';

/**
 * 技术专题分析模板（二合一流程：时间线 + 技术排查 + 5Why 追根因）。
 *
 * sections 结构设计意图（按排查顺序组织）：
 *   ① incidentOverview：影响面概述 —— occurredAt 默认 auto_now（打开即填当前时刻，
 *      用户仍可用选择器调整），summary 限制 200 字以内；
 *   ② timelineEntries：时间线还原（repeatable）—— 逐节点记录事件、来源、
 *      关键节点标记与行动正确性，还原全貌；
 *   ③ technicalInvestigation：问题定位 —— 记录受影响系统、错误堆栈、变更关联
 *      （changeDetail 仅在"有相关变更"时联动显示）、监控证据与可复现性；
 *   ④ diagnosisSteps：排查记录（repeatable）—— 逐条记录排查动作与结论，
 *      time 字段 autoTimestamp 自动填当前时间；
 *   ⑤ problemLocate：问题定位结论 —— 把前序证据收敛成一句话问题；
 *   ⑥ whyChain：5 Why 根因追问（repeatable）—— 针对定位到的问题逐层追问，
 *      stopAppendWhen 在确认根因后停止追加；
 *   ⑦ rootCauseConfirm：根因判定 —— 明确根因是哪个代码/配置层面的问题；
 *   ⑧ createRemedySection()：根因结论 —— 自动汇总"问题 + 根因"。
 *
 * phases 结构设计意图：四阶段依次对应影响面发现 → 问题定位 → 根因追溯 → 根因结论，
 * 每阶段 completionFields 收集该阶段"必须填好"的字段 id；根因结论阶段
 * completesRecord=true，rootCauseSummary 填好即整份记录完成。
 */
export const techIncidentTemplate: FormTemplate = {
  id: 'techIncident',
  name: '技术专题分析',
  icon: '🛠️',
  description: '面向技术故障的一条龙分析：时间线发现影响面 → 日志定位问题 → 5Why 追溯根因',
  scenarios: [
    '线上服务告警，接口/数据库出现异常，需要一条龙还原影响、定位问题、追溯根因',
    '发布变更后用户反馈功能异常，先梳理时间线再排查根因',
    '基础设施（服务器/网络/存储）故障影响业务，需要完整的事故复盘',
  ],
  flowSteps: [
    '从告警/监控发现出发，用时间线还原事件经过，梳理影响面',
    '结合日志报错与监控证据，锁定具体问题',
    '针对问题逐层追问 5Why，追溯到代码/配置层面的根因，制定对策',
  ],
  sections: [
    {
      id: 'incidentOverview',
      title: '影响面概述',
      fields: [
        // defaultValue: 'auto_now' —— datetime 类型的魔法默认值：
        // 打开表单即自动填入当前日期时间，用户仍可用选择器调整。
        { id: 'occurredAt', label: '发生时间（自动填入当前时间，可用选择器调整）', type: 'datetime', defaultValue: 'auto_now' },
        { id: 'impactScope', label: '影响范围', type: 'radio', options: IMPACT_SCOPE_OPTIONS },
        { id: 'severity', label: '严重程度', type: 'radio', options: SEVERITY_OPTIONS },
        {
          id: 'summary',
          label: '事件摘要',
          type: 'textarea',
          required: true,
          hint: '200 字以内概括',
          // validation.maxLength=200：摘要长度上限校验，超长无法提交，强制用户概括重点。
          validation: { maxLength: 200 },
        },
      ],
    },
    {
      id: 'timelineEntries',
      title: '时间线还原（影响面发现）',
      // repeatable + minEntries: 1：时间线是"可追加条目"列表，至少记录 1 个事件节点
      // 才算完成本分区。
      repeatable: true,
      repeatLabel: '事件节点 {n}',
      minEntries: 1,
      fields: [
        { id: 'time', label: '时间点', type: 'text', placeholder: '如 14:32' },
        { id: 'eventDesc', label: '事件描述', type: 'textarea', required: true, placeholder: '这个时间点发生了什么？（告警/监控/日志/操作）' },
        {
          id: 'sourceType',
          label: '信息来源',
          type: 'radio',
          options: [
            { value: 'alarm', label: '告警' },
            { value: 'monitor', label: '监控' },
            { value: 'log', label: '日志' },
            { value: 'manual', label: '人工观察' },
            { value: 'userFeedback', label: '用户反馈' },
            { value: 'other', label: '其他' },
          ],
        },
        { id: 'isKeyMoment', label: '关键节点？', type: 'checkbox', hint: '标记转折点' },
        { id: 'actionTaken', label: '当时采取的行动', type: 'textarea', placeholder: '当时做了什么决策或操作？' },
        {
          id: 'actionCorrectness',
          label: '事后看该行动是否正确',
          type: 'radio',
          options: [
            { value: 'correct', label: '正确' },
            { value: 'wrong', label: '错误' },
            { value: 'improvable', label: '可优化' },
            { value: 'unclear', label: '无法判断' },
          ],
        },
      ],
    },
    {
      id: 'technicalInvestigation',
      title: '问题定位（技术排查）',
      fields: [
        { id: 'affectedSystem', label: '故障所属系统/服务', type: 'text', required: true, autocomplete: true, placeholder: '如 order-service、MySQL 主库、CDN 节点…' },
        {
          id: 'environment',
          label: '发现环境',
          type: 'radio',
          options: [
            { value: 'production', label: '生产' },
            { value: 'staging', label: '预发' },
            { value: 'testing', label: '测试' },
            { value: 'development', label: '开发' },
          ],
        },
        { id: 'errorSignature', label: '错误信息/异常堆栈', type: 'textarea', required: true, placeholder: '粘贴关键错误信息、异常堆栈或告警内容…' },
        { id: 'affectedComponents', label: '受影响的组件/服务', type: 'textarea', placeholder: '列出受影响的上下游服务、中间件或基础设施组件…' },
        {
          id: 'hasRecentChange',
          label: '故障前是否有相关变更',
          type: 'radio',
          options: [
            { value: 'yes', label: '是' },
            { value: 'no', label: '否' },
          ],
        },
        {
          id: 'changeDetail',
          label: '变更详情',
          type: 'textarea',
          hint: '发布/配置/扩缩容等',
          // condition 联动：仅当 hasRecentChange 选择 'yes'（有相关变更）时才显示，
          // 避免没变更时也要求填无关的变更详情。
          condition: { dependsOn: 'hasRecentChange', showWhen: 'yes' },
        },
        { id: 'monitoringEvidence', label: '监控/日志证据', type: 'textarea', placeholder: '监控截图链接、日志片段或指标异常描述…' },
        {
          id: 'reproducibility',
          label: '是否可复现',
          type: 'radio',
          options: [
            { value: 'reproducible', label: '可复现' },
            { value: 'notReproducible', label: '不可复现' },
            { value: 'intermittent', label: '间歇性' },
          ],
        },
      ],
    },
    {
      id: 'diagnosisSteps',
      title: '排查记录',
      repeatable: true,
      repeatLabel: '排查记录 {n}',
      minEntries: 1,
      fields: [
        // autoTimestamp: true —— 新加一条排查记录时，time 自动填入当前时间（HH:mm 格式）。
        { id: 'time', label: '时间', type: 'text', placeholder: '自动填入当前时间', autoTimestamp: true },
        { id: 'action', label: '排查动作', type: 'textarea', required: true, hint: '做了什么排查', placeholder: '具体执行了什么操作？查看了哪些日志/监控？' },
        { id: 'finding', label: '排查发现', type: 'textarea', placeholder: '这次排查得到了什么结论或线索？' },
        {
          id: 'conclusion',
          label: '结论',
          type: 'radio',
          options: [
            { value: 'rootCause', label: '是根因' },
            { value: 'excluded', label: '已排除' },
            { value: 'continue', label: '需继续排查' },
          ],
        },
      ],
    },
    {
      id: 'problemLocate',
      title: '问题定位结论',
      fields: [
        { id: 'problemSummary', label: '定位到的问题', type: 'textarea', required: true, placeholder: '综合时间线与日志证据，用一句话明确复述具体问题（一般日志有报错）…' },
      ],
    },
    {
      id: 'whyChain',
      title: '5 Why 根因追问',
      description: '针对上方"问题定位结论"逐层追问"为什么会发生"，每层附上证据；任意一层确认为根因即可停止。下方每层会自动展示上一阶段/上一层的依据，无需手动复制。',
      repeatable: true,
      repeatLabel: '第 {n} 层 Why',
      minEntries: 1,
      // stopAppendWhen：监听每条目的 isRootCause 字段，一旦某层选择
      // value 为 'yes'（是根因），立即停止允许添加新一层 Why —— 根因已确认就不必再追问。
      stopAppendWhen: { fieldId: 'isRootCause', value: 'yes' },
      fields: [
        { id: 'why', label: '为什么会发生？', type: 'textarea', required: true, placeholder: '针对问题/上一层答案继续追问：为什么会这样？' },
        {
          id: 'evidenceType',
          label: '支撑依据的类型',
          type: 'radio',
          options: [
            { value: 'fact', label: '客观事实（可验证的已发生事件）' },
            { value: 'data', label: '数据（数字/指标/统计）' },
            { value: 'opinion', label: '主观观点（个人判断/推测）' },
          ],
        },
        {
          id: 'evidence',
          label: '具体依据内容',
          type: 'textarea',
          placeholder: '描述支撑这一层判断的具体依据（日志/配置/代码/指标…）',
        },
        {
          id: 'isRootCause',
          label: '这一层是否是根因？',
          type: 'radio',
          options: [
            { value: 'yes', label: '是根因' },
            { value: 'continue', label: '还需继续追问' },
            { value: 'unsure', label: '不确定' },
          ],
        },
      ],
    },
    {
      id: 'rootCauseConfirm',
      title: '根因判定',
      fields: [
        { id: 'rootCauseJudgement', label: '根因判定', type: 'textarea', required: true, placeholder: '综合 5Why 追问结论，明确根因是哪个代码/配置层面的问题' },
      ],
    },
    // 根因结论分区：confirmedCauseFormula 把"定位到的问题（problemSummary）"与
    // "根因判定（rootCauseJudgement）"拼成两行作为根因结论初值；
    // rootCauseSummaryFormula 生成一句话总结（问题 → 根因 的因果链描述）。
    createRemedySection({
      confirmedCauseDeps: ['problemLocate', 'rootCauseConfirm'],
      confirmedCauseFormula: (values) => {
        const ps = typeof values.problemSummary === 'string' ? values.problemSummary.trim() : '';
        const rc = typeof values.rootCauseJudgement === 'string' ? values.rootCauseJudgement.trim() : '';
        const lines: string[] = [];
        if (ps) lines.push(`问题：${ps}`);
        if (rc) lines.push(`根因：${rc}`);
        return lines.join('\n');
      },
      rootCauseSummaryDeps: ['problemLocate', 'rootCauseConfirm'],
      rootCauseSummaryFormula: (values) => {
        const rc = typeof values.rootCauseJudgement === 'string' ? values.rootCauseJudgement.trim() : '';
        const ps = typeof values.problemSummary === 'string' ? values.problemSummary.trim() : '';
        if (rc && ps) return `${ps} → 经 5Why 追问判定根因为：${rc}`;
        if (rc) return `根因：${rc}`;
        if (ps) return `问题：${ps}`;
        return '';
      },
    }),
  ],
  phases: [
    {
      id: 'impactDiscovery',
      label: '影响面发现',
      icon: '🕒',
      // sectionIndices [0,1]：影响面概述 + 时间线还原；
      // completionFields 只需 summary（摘要）与 eventDesc（事件描述，repeatable 条目字段）。
      sectionIndices: [0, 1],
      completionFields: ['summary', 'eventDesc'],
    },
    {
      id: 'problemLocating',
      label: '问题定位',
      icon: '🔍',
      // 覆盖：问题定位（技术排查）+ 排查记录 + 问题定位结论；
      // 完成需填好系统/服务、错误信息/堆栈、排查动作、定位到的问题。
      sectionIndices: [2, 3, 4],
      completionFields: ['affectedSystem', 'errorSignature', 'action', 'problemSummary'],
    },
    {
      id: 'rootCauseTracing',
      label: '根因追溯',
      icon: '❓',
      // 覆盖：5 Why 根因追问 + 根因判定；
      // 完成需至少一层 why 填好 + 根因判定给出结论。
      sectionIndices: [5, 6],
      completionFields: ['why', 'rootCauseJudgement'],
    },
    {
      id: 'remedy',
      label: '根因结论',
      icon: '🛠️',
      sectionIndices: [7],
      // completesRecord: true —— rootCauseSummary（根因总结）填好即整份记录完成。
      completionFields: ['rootCauseSummary'],
      completesRecord: true,
    },
  ],
};
