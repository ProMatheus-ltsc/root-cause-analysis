/**
 * 对比分析法：通过 A/B 对比找出"为什么同样条件下有时出问题有时不出"的关键差异。
 *
 * 整体流程（分区 → 阶段）：
 *   ① 定义与对比：先写清"正常情况（期望）"和"异常情况（现状）"两个锚点，
 *      再用 4W2H 表格逐维度对比两边差异；
 *   ② 归因与对策：从对比差异中判定最可能根因，并制定验证方式与对策。
 */
import type { FormTemplate } from '../types';
import { W2H_OPTIONS } from './shared';

/**
 * 对比分析法模板。
 *
 * sections 结构设计意图：
 * - definitionAndComparison（定义与对比）：用 normalCase/abnormalCase 两个必填文本把"期望"
 *   与"现状"固定下来，然后交给 comparisonTable 表格按 4W2H 六个维度逐项对比；
 *   keyDifference 要求用户挑出 1-3 项最关键差异，为第二阶段归因做准备。
 * - attributionAndAction（归因与对策）：把差异收敛为"最可能的原因"，并要求给出对策。
 *
 * phases 结构设计意图：与 sections 一一对应，每个阶段通过 completionFields 判定
 * "必须填好的字段"是否齐全来决定阶段是否完成；最后一个阶段 completesRecord=true，
 * 表示该阶段完成即整份分析记录标记为"已完成"。
 */
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
    '列出对比维度表（至少 3 项），逐项记录差异',
    '总结关键差异，判定最可能的根因并总结结论',
  ],
  sections: [
    {
      id: 'definitionAndComparison',
      title: '定义与对比',
      description: '先把"问题中定义的期望"和"实际现状"明确写下来，再用 4W2H 维度逐项对比找出关键差异。',
      fields: [
        {
          id: 'normalCase',
          label: '正常情况描述（期望/目标）',
          type: 'textarea',
          required: true,
          placeholder: '一切正常时应达到的状态。例：教师备课默认从产品部资料库取材，资料使用率≥90%。可从问题定义中复制"目标/期望"字段。',
        },
        {
          id: 'abnormalCase',
          label: '异常情况描述（问题场景/症状）',
          type: 'textarea',
          required: true,
          placeholder: '当前实际发生的异常。例：教师从未使用产品部资料，资料使用率为0%。可从问题定义中复制"现状/症状"字段。',
        },
        {
          id: 'comparisonTable',
          label: '对比维度表（按 4W2H 拆分）',
          type: 'table',
          hint: '默认按 4W2H（Who/What/When/Where/Why/How）拆分 6 个维度，可点击"+ 添加一行"补充更多维度；每行填写两边表现并标注关键差异',
          // validation.min=3：表格至少要保留 3 行有效填写。默认预置 6 行（可增删），
          // 但删减不能少于 3 行，保证对比维度足够充分，避免只比 1~2 项就匆忙下结论。
          validation: { min: 3 },
          // defaultValue 预置 4W2H 六个维度的空行：每行含 dimension（维度）、
          // normal（正常表现）、abnormal（异常表现）、diff（关键差异）四个单元格。
          defaultValue: [
            { dimension: 'who', normal: '', abnormal: '', diff: '' },
            { dimension: 'what', normal: '', abnormal: '', diff: '' },
            { dimension: 'when', normal: '', abnormal: '', diff: '' },
            { dimension: 'where', normal: '', abnormal: '', diff: '' },
            { dimension: 'why', normal: '', abnormal: '', diff: '' },
            { dimension: 'how', normal: '', abnormal: '', diff: '' },
          ],
          tableColumns: [
            { id: 'dimension', label: '对比维度', type: 'select', options: W2H_OPTIONS },
            { id: 'normal', label: '正常时表现', placeholder: '正常情况下此维度的具体表现' },
            { id: 'abnormal', label: '异常时表现', placeholder: '异常情况下此维度的具体表现' },
            { id: 'diff', label: '关键差异', placeholder: '两者的关键差异是什么（能解释问题的那一项）' },
          ],
        },
        {
          id: 'keyDifference',
          label: '关键差异总结',
          type: 'textarea',
          required: true,
          placeholder: '上述对比中，哪些维度最可能是导致问题的关键因素？挑出 1-3 项深入分析。',
        },
      ],
    },
    {
      id: 'attributionAndAction',
      title: '归因与对策',
      fields: [
        { id: 'mostLikelyCause', label: '差异中最可能的原因', type: 'textarea', required: true, placeholder: '综合对比结果，判断最可能导致异常的根本原因是什么？' },
        { id: 'verificationMethod', label: '验证方式', type: 'textarea', placeholder: '如何验证这个判断是正确的？' },
        { id: 'action', label: '对策', type: 'textarea', required: true, placeholder: '针对关键差异，具体要采取什么行动来解决问题？' },
        // autocomplete: true —— 输入时联想同模板历史记录中该字段出现过的写法，辅助快速填写经验教训
        { id: 'lessonsLearned', label: '经验教训', type: 'textarea', autocomplete: true, placeholder: '这次经历有哪些可复用的发现？下次遇到类似情况应该怎么做？' },
      ],
    },
  ],
  phases: [
    {
      id: 'definitionAndComparison',
      label: '定义与对比',
      icon: '📋',
      sectionIndices: [0],
      // completionFields 表示该阶段"必须已填写"的字段：normalCase/abnormalCase 是
      // 对比的两个锚点，keyDifference 是差异总结，三者齐了才算"定义与对比"阶段完成。
      completionFields: ['normalCase', 'abnormalCase', 'keyDifference'],
    },
    {
      id: 'attributionAndAction',
      label: '归因与对策',
      icon: '🛠️',
      sectionIndices: [1],
      // 阶段完成只需最关键的两项：差异中最可能的原因 + 对策；
      // completesRecord: true 表示该阶段完成时，整份记录即视为"已完成"。
      completionFields: ['mostLikelyCause', 'action'],
      completesRecord: true,
    },
  ],
};
