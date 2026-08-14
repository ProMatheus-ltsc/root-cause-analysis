/**
 * 系统思考分析（因果回路图）：找出反复出现的系统性问题背后的循环因果关系。
 *
 * 已切换为"手动调 AI"模式：因果链段（causalChain）由外部 AI 完成，
 * 这里只保留 AI 回路/杠杆点面板 + 杠杆点总结（AI 自动填）+ 干预策略。
 * 旧因果链段不再让用户手动填写；历史 record 中已有的 causalChain 数据不影响新模板。
 *
 * 整体流程（分区 → 阶段）：
 *   ① 相关因素：确认问题是否反复出现（反复性问题才适合系统思考）；
 *   ② 回路与杠杆点：通过"手动调 AI"把问题与候选原因发给 AI，回填回路/杠杆点 JSON；
 *   ③ 干预策略：基于杠杆点制定干预方案，并评估副作用与监测方式。
 */
import type { FormTemplate } from '../types';

/**
 * 系统思考分析模板。
 *
 * sections 结构设计意图：
 * - relatedFactors：recurrence 单选确认"是否反复出现"——系统思考只处理反复性、
 *   循环性因果的问题，首次发生的问题不适用（phase 判定阶段完成不看它）。
 * - loopAnalysis：aiLoopAnalysis 是 custom 类型字段，渲染"手动调 AI"面板
 *   （导出上下文 → AI 返回回路/杠杆点 JSON → 解析回填），不直接存用户手填内容。
 * - intervention：干预策略分区，leveragePointSummary / interventionPlan 由 AI
 *   自动填充（label 中注明），sideEffects / monitorPlan / lessonsLearned 由用户补充。
 *
 * phases 结构设计意图：causalAnalysis 阶段覆盖相关因素 + 回路与杠杆点，
 * 但 completionFields 为空数组 —— 因为 AI 模式下没有"手动填必填字段"这一说，
 * 阶段完成改为由 AI 分析结果是否存在来判定；intervention 阶段 completesRecord=true。
 */
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
    '查看 AI 识别的回路与杠杆点（下方可视化会自动展示）',
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
      description: '使用"手动调 AI"模式：把问题与候选原因导出给外部 AI，AI 返回回路与杠杆点 JSON，粘贴回来即可解析应用。完整杠杆点会在可视化区域与下方干预策略中展示。',
      fields: [
        {
          id: 'aiLoopAnalysis',
          label: 'AI 辅助识别回路与杠杆点',
          type: 'custom',
        },
        {
          id: 'aiAnalysisRaw',
          label: 'AI 分析原始数据',
          type: 'hidden',
        },
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
      sectionIndices: [0, 1],
      completionFields: ['aiAnalysisRaw'],
    },
    {
      id: 'intervention',
      label: '干预策略',
      icon: '🛠️',
      sectionIndices: [2],
      // AI 模式下干预策略同样不设必填完成字段，由用户自行判断是否收尾；
      // completesRecord: true —— 该阶段完成即整份记录视为"已完成"。
      completionFields: [],
      completesRecord: true,
    },
  ],
};
