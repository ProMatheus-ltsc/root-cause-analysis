/**
 * 系统思考分析（因果回路图）：找出反复出现的系统性问题背后的循环因果关系。
 *
 * 已切换为"手动调 AI"模式：因果链段（causalChain）由外部 AI 完成，
 * 这里只保留 AI 回路/杠杆点面板 + 系统自动检测（兼容旧数据） + 杠杆点总结 + 干预策略。
 * 旧因果链段不再让用户手动填写；历史 record 中已有的 causalChain 数据会被 detectLoopsText
 * 仍然识别为"系统自动检测的回路"（可选参考）。
 */
import type { FormTemplate } from '../types';
import { detectLoopsText } from '../utils/loopDetection';

export const systemThinkingTemplate: FormTemplate = {
  id: 'systemThinking',
  name: '系统思考分析',
  icon: '🔄',
  description: '绘制因果回路，找到反复出现的系统性问题的杠杆点（建议配合"手动调 AI"功能）',
  scenarios: [
    '夫妻/情侣之间"越吵越冷、越冷越吵"的恶性循环，想找到打破僵局的切入点',
    '公司"加班→离职→人手不够→更加班"的死循环，想找到系统层面的杠杆解',
    '减肥总是反弹——节食→暴食→自责→再节食，想理清这个循环的因果结构',
  ],
  flowSteps: [
    '把问题与候选原因导出给外部 AI（"手动调 AI"模式），AI 返回回路与杠杆点 JSON 粘贴回应用',
    '识别增强回路与调节回路（系统自动检测作为辅助参考），找出系统杠杆点',
    '制定干预方案，提前评估可能的副作用',
  ],
  sections: [
    {
      id: 'relatedFactors',
      title: '相关因素',
      fields: [
        { id: 'recurrence', label: '这个问题是否反复出现？', type: 'radio', options: [
          { value: 'first', label: '首次' },
          { value: 'occasional', label: '偶尔' },
          { value: 'frequent', label: '经常' },
          { value: 'always', label: '每次都会' },
        ] },
      ],
    },
    {
      id: 'loopAnalysis',
      title: '回路与杠杆点',
      description: '使用"手动调 AI"模式：把问题与候选原因导出给外部 AI，AI 返回回路与杠杆点 JSON，粘贴回来即可解析应用。系统也提供基于已有因果链数据的自动检测（仅参考）。',
      fields: [
        {
          id: 'aiLoopAnalysis',
          label: 'AI 辅助识别回路与杠杆点',
          type: 'custom',
        },
        {
          id: 'detectedLoops',
          label: '系统自动检测的回路（基于因果链数据，可选）',
          type: 'text',
          computed: {
            dependsOn: ['causalChain'],
            formula: (values) => detectLoopsText(values),
          },
        },
        { id: 'leveragePoint', label: '系统杠杆点在哪里？', type: 'textarea', required: true, placeholder: '参考上方 AI 识别的回路/杠杆点，或自动检测的回路，在哪个环节施加最小干预能产生最大系统改变？' },
      ],
    },
    {
      id: 'intervention',
      title: '干预策略',
      description: '由 AI 自动填充"杠杆点总结 + 干预方案"，你只需在此基础上修改/补充。预期副作用、监测方式与经验教训 AI 暂不提供，请自行补充。',
      fields: [
        { id: 'leveragePointSummary', label: '系统杠杆点总结（AI 自动填）', type: 'textarea', placeholder: '回顾上面的因果链分析，总结系统的关键杠杆点…' },
        { id: 'interventionPlan', label: '干预方案（AI 自动填）', type: 'textarea', placeholder: '具体要在杠杆点上做什么干预？分几步实施？' },
        { id: 'sideEffects', label: '预期副作用', type: 'textarea', hint: '系统干预常有意外后果，提前想清楚', placeholder: '这个干预可能在其他环节引发什么意外后果？' },
        { id: 'monitorPlan', label: '如何监测干预效果', type: 'textarea', placeholder: '用什么指标或方式来判断干预是否有效？' },
        { id: 'lessonsLearned', label: '经验教训', type: 'textarea', autocomplete: true, placeholder: '这次经历有哪些可复用的发现？下次遇到类似情况应该怎么做？' },
      ],
    },
  ],
  phases: [
    {
      id: 'causalAnalysis',
      label: '系统分析',
      icon: '🔄',
      // sections: 0=相关因素, 1=回路与杠杆点（AI/自动检测）
      sectionIndices: [0, 1],
      // AI 模式下无需手动录因果链；杠杆点（来自 AI 结果或手动分析）为完成条件
      completionFields: ['leveragePoint'],
    },
    {
      id: 'intervention',
      label: '干预策略',
      icon: '🛠️',
      sectionIndices: [2],
      completionFields: [],
      completesRecord: true,
    },
  ],
};
