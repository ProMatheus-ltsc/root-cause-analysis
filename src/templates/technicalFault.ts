/**
 * 技术故障根因分析：面向生产/系统技术故障的排查与归因，覆盖故障定义、技术排查与对策制定。
 *
 * 整体流程（分区 → 阶段）：
 *   ① 技术排查：记录受影响系统、错误堆栈、变更关联、监控证据与可复现性；
 *   ② 排查记录：逐条记录排查动作与结论，锁定根因；
 *   ③ 综合分析：综合排查结论给出根因判定；
 *   ④ 根因结论：createRemedySection 汇总根因与验证对策，完成即记录完成。
 *
 * 注意：本模板与 timeline 一起已二合一为 techIncident（技术专题），
 * 此处保留注册仅用于兼容历史数据打开/导出，不再作为新入口。
 */
import type { FormTemplate } from '../types';
import { createRemedySection } from './shared';

/**
 * 技术故障根因分析模板。
 *
 * sections 结构设计意图：
 * - technicalInvestigation（技术排查）：故障基本盘，affectedSystem 必填且带自动补全，
 *   errorSignature 记录关键报错/堆栈；hasRecentChange 用 radio 询问"故障前是否有变更"，
 *   其 changeDetail 字段用 condition 联动——选了"是"才出现，避免无变更时填无关内容。
 * - diagnosisSteps（排查记录）：repeatable 列表，逐条记录排查动作与发现，
 *   time 字段 autoTimestamp 自动填当前时间，conclusion 标记该条是根因/排除/需继续。
 * - comprehensiveAnalysis（综合分析）：根因判定收口。
 * - createRemedySection()：标准根因结论分区（无自动汇总公式，全部手动填写）。
 *
 * phases 结构设计意图：investigation 阶段覆盖前三个分区（索引 0-2），
 * 完成需 affectedSystem、排查动作 action、根因判定 rootCauseJudgement 都填好；
 * remedy 阶段 completesRecord=true，rootCauseSummary 填好即整份记录完成。
 */
export const technicalFaultTemplate: FormTemplate = {
  id: 'technicalFault',
  name: '技术故障根因分析',
  icon: '🔧',
  description: '面向生产/系统技术故障的排查与根因归因',
  scenarios: [
    '线上服务告警，接口/数据库出现异常需要系统性排查',
    '发布变更后用户反馈功能异常，需要记录排查过程并归因',
    '基础设施（服务器/网络/存储等）故障影响业务运行',
  ],
  flowSteps: [
    '记录排查过程：错误堆栈、变更关联、监控证据',
    '逐条记录排查动作与结论，锁定根因',
    '确认根因并总结结论',
  ],
  sections: [
    {
      id: 'technicalInvestigation',
      title: '技术排查',
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
        { id: 'errorSignature', label: '错误信息/异常堆栈', type: 'textarea', placeholder: '粘贴关键错误信息、异常堆栈或告警内容…' },
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
          // condition 联动：仅当 hasRecentChange 选择 'yes' 时才显示变更详情，
          // 与 techIncident 模板的联动逻辑一致。
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
      id: 'comprehensiveAnalysis',
      title: '综合分析',
      fields: [{ id: 'rootCauseJudgement', label: '根因判定', type: 'textarea', required: true, placeholder: '综合排查结论，明确判定最终根因是什么' }],
    },
    createRemedySection(),
  ],
  phases: [
    {
      id: 'investigation',
      label: '技术排查',
      icon: '🔍',
      // sectionIndices [0,1,2]：技术排查 + 排查记录 + 综合分析；
      // 完成需 action（排查动作，repeatable 条目字段）、affectedSystem（系统）、
      // rootCauseJudgement（根因判定）三者齐备。
      sectionIndices: [0, 1, 2],
      completionFields: ['action', 'affectedSystem', 'rootCauseJudgement'],
    },
    {
      id: 'remedy',
      label: '根因结论',
      icon: '🛠️',
      sectionIndices: [3],
      // completesRecord: true —— rootCauseSummary（根因总结）填好即整份记录完成。
      completionFields: ['rootCauseSummary'],
      completesRecord: true,
    },
  ],
};
