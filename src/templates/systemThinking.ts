/**
 * 系统思考分析（因果回路图）：找出反复出现的系统性问题背后的循环因果关系。
 */
import type { FormTemplate } from '../types';
import { createProblemIdentificationSection } from './shared';

export const systemThinkingTemplate: FormTemplate = {
  id: 'systemThinking',
  name: '系统思考分析',
  icon: '🔄',
  description: '绘制因果回路，找到反复出现的系统性问题的杠杆点',
  scenarios: [
    '夫妻/情侣之间"越吵越冷、越冷越吵"的恶性循环，想找到打破僵局的切入点',
    '公司"加班→离职→人手不够→更加班"的死循环，想找到系统层面的杠杆解',
    '减肥总是反弹——节食→暴食→自责→再节食，想理清这个循环的因果结构',
  ],
  flowSteps: [
    '鉴别并清晰描述问题，评估其复发频率',
    '列出已知相关因素，逐条分析因果关系（正/负反馈）与延迟效应',
    '识别增强回路与调节回路，找出系统杠杆点',
    '制定干预方案，提前评估可能的副作用',
  ],
  sections: [
    {
      id: 'problemDefinition',
      title: '问题定义',
      fields: [
        { id: 'title', label: '问题标题', type: 'text', required: true },
        {
          id: 'problemStatement',
          label: '一句话问题陈述',
          type: 'textarea',
          required: true,
          hint: '鉴别问题的第一原则：先界定问题，再寻找原因。陈述中不包含原因猜测与解决方案。',
          placeholder: '用一句话客观描述：什么对象、在什么条件下、发生了什么。',
        },
        {
          id: 'recurrence',
          label: '这个问题是否反复出现？',
          type: 'radio',
          options: [
            { value: 'first', label: '首次' },
            { value: 'occasional', label: '偶尔' },
            { value: 'frequent', label: '经常' },
            { value: 'always', label: '每次都会' },
          ],
        },
        { id: 'relatedFactors', label: '已知的相关因素列表', type: 'textarea', hint: '每行一个', placeholder: '列出所有你认为与问题相关的因素，每行一个…' },
      ],
    },
    createProblemIdentificationSection(),
    {
      id: 'causalChain',
      title: '因果链分析',
      repeatable: true,
      repeatLabel: '因果链 {n}',
      minEntries: 1,
      fields: [
        { id: 'factorA', label: '因素 A', type: 'text', required: true },
        {
          id: 'relationType',
          label: '关系类型',
          type: 'radio',
          options: [
            { value: 'reinforcing', label: 'A 增加 → B 增加（正反馈）' },
            { value: 'balancing', label: 'A 增加 → B 减少（负反馈）' },
            { value: 'causal', label: 'A 触发 → B 发生（因果链）' },
          ],
        },
        { id: 'factorB', label: '因素 B', type: 'text', required: true },
        {
          id: 'delayEffect',
          label: '延迟效应',
          type: 'radio',
          options: [
            { value: 'immediate', label: '即时' },
            { value: 'shortTerm', label: '短期（天）' },
            { value: 'midTerm', label: '中期（周-月）' },
            { value: 'longTerm', label: '长期（季-年）' },
          ],
        },
        { id: 'evidence', label: '这条因果关系的证据', type: 'textarea', placeholder: '有什么数据或观察能证明这条因果关系存在？' },
      ],
    },
    {
      id: 'loopAnalysis',
      title: '回路与杠杆点',
      fields: [
        { id: 'hasReinforcingLoop', label: '是否存在增强回路？', type: 'checkbox' },
        { id: 'hasBalancingLoop', label: '是否存在调节回路？', type: 'checkbox' },
        { id: 'leveragePoint', label: '系统杠杆点在哪里？', type: 'textarea', required: true, placeholder: '在哪个环节施加最小干预能产生最大系统改变？' },
      ],
    },
    {
      id: 'intervention',
      title: '干预策略',
      fields: [
        { id: 'leveragePointSummary', label: '系统杠杆点总结', type: 'textarea', placeholder: '回顾上面的因果链分析，总结系统的关键杠杆点…' },
        { id: 'interventionPlan', label: '干预方案', type: 'textarea', required: true, placeholder: '具体要在杠杆点上做什么干预？分几步实施？' },
        { id: 'sideEffects', label: '预期副作用', type: 'textarea', hint: '系统干预常有意外后果，提前想清楚', placeholder: '这个干预可能在其他环节引发什么意外后果？' },
        { id: 'monitorPlan', label: '如何监测干预效果', type: 'textarea', placeholder: '用什么指标或方式来判断干预是否有效？' },
        { id: 'lessonsLearned', label: '经验教训', type: 'textarea', autocomplete: true, placeholder: '这次经历有哪些可复用的发现？下次遇到类似情况应该怎么做？' },
      ],
    },
  ],
  phases: [
    {
      id: 'problemDefinition',
      label: '问题鉴别',
      icon: '🎯',
      sectionIndices: [0, 1],
      completionFields: ['title', 'problemStatement'],
    },
    {
      id: 'causalAnalysis',
      label: '因果链分析',
      icon: '🔄',
      sectionIndices: [2, 3],
      completionFields: ['factorA', 'factorB', 'leveragePoint'],
    },
    {
      id: 'intervention',
      label: '干预策略',
      icon: '🛠️',
      sectionIndices: [4],
      completionFields: ['interventionPlan'],
      completesRecord: true,
    },
  ],
};
