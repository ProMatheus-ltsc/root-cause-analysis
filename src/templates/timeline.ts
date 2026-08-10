/**
 * 时间线分析法：还原事件经过的事后分析（类似 SRE Postmortem）。
 */
import type { FormTemplate } from '../types';
import { createActionSection, createProblemCriteriaFields, createProblemIdentificationSection, createProblemSummarySection } from './shared';
import { IMPACT_SCOPE_OPTIONS, SEVERITY_OPTIONS } from './shared';

export const timelineTemplate: FormTemplate = {
  id: 'timeline',
  name: '时间线分析法',
  icon: '🕒',
  description: '还原事件经过，适合故障/事故的事后根因分析',
  scenarios: [
    '一次商务谈判破裂，想按时间线还原每个阶段的沟通与决策失误',
    '家庭旅行计划临时取消，需要还原从计划到取消过程中每一步出了什么问题',
    '客户投诉升级为舆情事件，需要完整还原从首次反馈到扩散的全过程',
  ],
  flowSteps: [
    '鉴别并清晰描述事件，界定影响边界',
    '按时间顺序逐个记录关键节点、信息来源与当时的行动',
    '标记转折点，回顾每个行动事后看是否正确',
    '归纳直接原因与根本原因，从检测/响应/预防三个维度提出改进',
  ],
  sections: [
    {
      id: 'eventOverview',
      title: '事件概述',
      fields: [
        ...createProblemCriteriaFields(),
        { id: 'occurredAt', label: '发生时间', type: 'date', defaultValue: 'auto_today' },
        { id: 'duration', label: '持续时长（分钟）', type: 'number' },
        { id: 'impactScope', label: '影响范围', type: 'radio', options: IMPACT_SCOPE_OPTIONS },
        { id: 'severity', label: '严重程度', type: 'radio', options: SEVERITY_OPTIONS },
        {
          id: 'summary',
          label: '事件摘要',
          type: 'textarea',
          required: true,
          hint: '200 字以内概括',
          validation: { maxLength: 200 },
        },
      ],
    },
    createProblemIdentificationSection(),
    createProblemSummarySection(),
    {
      id: 'timelineEntries',
      title: '时间线还原',
      repeatable: true,
      repeatLabel: '事件节点 {n}',
      minEntries: 1,
      fields: [
        { id: 'time', label: '时间点', type: 'text', placeholder: '如 14:32' },
        { id: 'eventDesc', label: '事件描述', type: 'textarea', required: true, placeholder: '这个时间点发生了什么？' },
        {
          id: 'sourceType',
          label: '信息来源',
          type: 'radio',
          options: [
            { value: 'log', label: '日志' },
            { value: 'monitor', label: '监控' },
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
      id: 'attribution',
      title: '归因与改进',
      fields: [
        { id: 'directCause', label: '直接原因', type: 'textarea', required: true, placeholder: '直接导致事件发生的触发因素是什么？' },
        { id: 'rootCause', label: '根本原因', type: 'textarea', required: true, placeholder: '导致直接原因存在的深层系统性问题是什么？' },
        { id: 'whyNotDetectedEarlier', label: '为什么没有更早发现？', type: 'textarea', placeholder: '检测机制哪里失灵了？' },
        { id: 'whyImpactSoLarge', label: '为什么影响范围这么大？', type: 'textarea', placeholder: '为什么没能把影响控制在更小范围？' },
        { id: 'improveDetection', label: '改进措施——检测能力', type: 'textarea', hint: '如何更早发现', placeholder: '增加哪些监控/告警可以更早发现类似问题？' },
        { id: 'improveResponse', label: '改进措施——响应能力', type: 'textarea', hint: '如何更快恢复', placeholder: '如何缩短从发现到恢复的时间？' },
        { id: 'improvePrevention', label: '改进措施——预防能力', type: 'textarea', hint: '如何避免再次发生', placeholder: '从根本上防止类似问题再次发生的措施…' },
        { id: 'lessonsLearned', label: '经验教训', type: 'textarea', required: true, autocomplete: true, placeholder: '这次经历有哪些可复用的发现？下次遇到类似情况应该怎么做？' },
      ],
    },
    createActionSection(),
  ],
  phases: [
    {
      id: 'eventOverview',
      label: '问题鉴别',
      icon: '🎯',
      sectionIndices: [0, 1, 2],
      completionFields: ['title', 'problemStatement', 'problemCriteria', 'problemType', 'summary', 'gapTarget'],
    },
    {
      id: 'timelineEntries',
      label: '时间线还原',
      icon: '🕒',
      sectionIndices: [3],
      completionFields: ['eventDesc'],
    },
    {
      id: 'attribution',
      label: '归因与改进',
      icon: '🛠️',
      sectionIndices: [4],
      completionFields: ['directCause', 'rootCause', 'lessonsLearned'],
    },
    {
      id: 'action',
      label: '对策实施',
      icon: '✅',
      sectionIndices: [5],
      completionFields: ['measure'],
      completesRecord: true,
    },
  ],
};
