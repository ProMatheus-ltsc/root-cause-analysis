/**
 * 技术故障根因分析：面向生产/系统技术故障的排查与归因，覆盖故障定义、技术排查与对策制定。
 */
import type { FormTemplate } from '../types';
import { createProblemDefinitionSection, createProblemIdentificationSection, createRemedySection } from './shared';

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
    '鉴别并清晰描述故障，界定影响边界',
    '记录排查过程：错误堆栈、变更关联、监控证据',
    '逐条记录排查动作与结论，锁定根因',
    '确认根因并总结结论',
  ],
  sections: [
    createProblemDefinitionSection([
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
    ]),
    createProblemIdentificationSection(),
    {
      id: 'technicalInvestigation',
      title: '技术排查',
      fields: [
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
      id: 'problemDefinition',
      label: '故障鉴别',
      icon: '🎯',
      sectionIndices: [0, 1],
      completionFields: ['title', 'problemStatement', 'symptom', 'affectedSystem'],
    },
    {
      id: 'investigation',
      label: '技术排查',
      icon: '🔍',
      sectionIndices: [2, 3, 4],
      completionFields: ['action', 'rootCauseJudgement'],
    },
    {
      id: 'remedy',
      label: '根因结论',
      icon: '🛠️',
      sectionIndices: [5],
      completionFields: ['rootCauseSummary'],
      completesRecord: true,
    },
  ],
};
