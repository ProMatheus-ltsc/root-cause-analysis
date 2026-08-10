/**
 * 5 Why 分析法：快速找到单一问题的深层原因。
 */
import type { FormTemplate } from '../types';
import { createProblemDefinitionSection, createRemedySection } from './shared';

export const fiveWhyTemplate: FormTemplate = {
  id: 'fiveWhy',
  name: '5 Why 分析法',
  icon: '❓',
  description: '通过连续追问"为什么"，快速找到单一问题的深层原因',
  scenarios: [
    '孩子最近成绩突然下滑，想找到背后真正原因而不是只盯着分数',
    '团队季度目标连续未达成，表面看是执行力问题但总觉得有更深层原因',
    '家庭开支总是超预算，想追问到底钱花在了哪个环节',
  ],
  flowSteps: [
    '描述问题现象与影响范围',
    '逐层追问"为什么会发生"（建议 5 层），每层附上证据',
    '确认根因并总结结论',
  ],
  sections: [
    createProblemDefinitionSection(),
    {
      id: 'whyChain',
      title: '5 Why 追问',
      description: '最少追问 2 层，建议 5 层。任意一层确认为根因即可停止。',
      repeatable: true,
      repeatLabel: '第 {n} 层 Why',
      minEntries: 2,
      stopAppendWhen: { fieldId: 'isRootCause', value: 'yes' },
      fields: [
        { id: 'why', label: '为什么会发生？', type: 'textarea', required: true, placeholder: '针对上一层的答案继续追问：为什么会这样？' },
        {
          id: 'evidenceType',
          label: '支撑依据的类型',
          type: 'radio',
          options: [
            { value: 'fact', label: '客观事实（可验证的已发生事件）' },
            { value: 'data', label: '数据（数字/指标/统计）' },
            { value: 'opinion', label: '主观观点（个人判断/推测）' },
            { value: 'emotion', label: '情绪感受（直觉/感觉）' },
          ],
        },
        {
          id: 'evidence',
          label: '具体依据内容',
          type: 'textarea',
          placeholder: '描述支撑这一层判断的具体依据…',
          conditionalHints: {
            fact: '请描述具体发生了什么、何时何地、谁观察到的',
            data: '请注明数据来源、采集时间和统计口径',
            opinion: '注意：观点不等于事实，建议补充可验证的证据',
            emotion: '注意：情绪不能作为归因依据，请尝试找到背后的客观事实',
          },
          hintDependsOn: 'evidenceType',
        },
        {
          id: 'dataCredibility',
          label: '数据可信度评估',
          type: 'radio',
          condition: { dependsOn: 'evidenceType', showWhen: 'data' },
          options: [
            { value: 'primary', label: '一手数据（自己采集/系统直出）' },
            { value: 'secondary', label: '二手数据（他人转述/报告引用）' },
            { value: 'uncertain', label: '来源不确定' },
          ],
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
    createRemedySection(),
  ],
  phases: [
    {
      id: 'problemDefinition',
      label: '问题定义',
      icon: '📋',
      sectionIndices: [0],
      completionFields: ['title', 'symptom'],
    },
    {
      id: 'whyChain',
      label: '5 Why 追问',
      icon: '🔍',
      sectionIndices: [1],
      completionFields: ['why'],
    },
    {
      id: 'remedy',
      label: '根因结论',
      icon: '🛠️',
      sectionIndices: [2],
      completionFields: ['rootCauseSummary'],
      completesRecord: true,
    },
  ],
};
