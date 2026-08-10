/**
 * 对比分析法：通过 A/B 对比找出"为什么同样条件下有时出问题有时不出"的关键差异。
 */
import type { FormTemplate } from '../types';
import { createActionSection, createProblemCriteriaFields, createProblemIdentificationSection, createProblemSummarySection } from './shared';

export const comparisonTemplate: FormTemplate = {
  id: 'comparison',
  name: '对比分析法',
  icon: '⚖️',
  description: '对比正常与异常情况的差异，定位关键因素',
  scenarios: [
    '同一个销售话术，A 门店业绩好 B 门店差，想找出关键差异',
    '同样的教育方式对老大有效对老二无效，对比两个孩子的不同反应找原因',
    '同一批简历筛选标准，这次招到的人明显不如上次，对比两次流程差异',
  ],
  flowSteps: [
    '鉴别并清晰描述问题，界定正常与异常的边界',
    '列出对比维度表（至少 3 项），逐项记录差异',
    '总结关键差异，判定最可能的根因并总结结论',
  ],
  sections: [
    {
      id: 'definitionAndComparison',
      title: '定义与对比',
      fields: [
        ...createProblemCriteriaFields(),
        { id: 'normalCase', label: '正常情况描述', type: 'textarea', required: true, placeholder: '描述一切正常时的情况：什么时间、什么条件、什么结果？' },
        { id: 'abnormalCase', label: '异常情况描述', type: 'textarea', required: true, placeholder: '描述出问题时的情况：什么时间、什么条件、什么结果？' },
        {
          id: 'comparisonTable',
          label: '对比维度表',
          type: 'table',
          hint: '至少 3 行',
          validation: { min: 3 },
          defaultValue: [
            { dimension: '', normal: '', abnormal: '', diff: '' },
            { dimension: '', normal: '', abnormal: '', diff: '' },
            { dimension: '', normal: '', abnormal: '', diff: '' },
          ],
          tableColumns: [
            { id: 'dimension', label: '对比项', placeholder: '如：执行时间/人员配置/环境条件' },
            { id: 'normal', label: '正常时', placeholder: '正常情况下该维度的表现' },
            { id: 'abnormal', label: '异常时', placeholder: '异常情况下该维度的表现' },
            { id: 'diff', label: '差异说明', placeholder: '两者的关键差异是什么' },
          ],
        },
        { id: 'keyDifference', label: '关键差异总结', type: 'textarea', required: true, placeholder: '上述对比中，哪些差异最可能是导致问题的关键因素？' },
      ],
    },
    createProblemIdentificationSection(),
    createProblemSummarySection(),
    {
      id: 'attributionAndAction',
      title: '归因与对策',
      fields: [
        { id: 'mostLikelyCause', label: '差异中最可能的原因', type: 'textarea', required: true, placeholder: '综合对比结果，判断最可能导致异常的根本原因是什么？' },
        { id: 'verificationMethod', label: '验证方式', type: 'textarea', placeholder: '如何验证这个判断是正确的？' },
        { id: 'action', label: '对策', type: 'textarea', required: true, placeholder: '针对关键差异，具体要采取什么行动来解决问题？' },
        { id: 'lessonsLearned', label: '经验教训', type: 'textarea', autocomplete: true, placeholder: '这次经历有哪些可复用的发现？下次遇到类似情况应该怎么做？' },
      ],
    },
    createActionSection(),
  ],
  phases: [
    {
      id: 'definitionAndComparison',
      label: '问题鉴别',
      icon: '🎯',
      sectionIndices: [0, 1, 2],
      completionFields: ['title', 'problemStatement', 'problemCriteria', 'problemType', 'normalCase', 'abnormalCase', 'keyDifference', 'gapTarget'],
    },
    {
      id: 'attributionAndAction',
      label: '归因与对策',
      icon: '🛠️',
      sectionIndices: [3],
      completionFields: ['mostLikelyCause', 'action'],
    },
    {
      id: 'actionImplementation',
      label: '对策实施',
      icon: '✅',
      sectionIndices: [4],
      completionFields: ['measure'],
      completesRecord: true,
    },
  ],
};
