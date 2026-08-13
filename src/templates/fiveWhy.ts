/**
 * 5 Why 分析法：快速找到单一问题的深层原因。
 * 问题定义/鉴别在独立的问题实体（Problem）中维护，此处只做根因分析。
 *
 * 整体流程（分区 → 阶段）：
 *   ① 5 Why 追问：repeatable 分区，一层一层追问"为什么会发生"，
 *      每层附证据并判断"是否是根因"，直到确认根因（stopAppendWhen 停止追加）；
 *   ② 根因结论：createRemedySection 自动汇总各层根因，完成即记录完成。
 */
import type { FormTemplate } from '../types';
import { createRemedySection } from './shared';

/**
 * 5 Why 分析法模板。
 *
 * sections 结构设计意图：
 * - whyChain（5 Why 追问）：repeatable 分区，用户每填一层就追加一层。
 *   minEntries:2 表示至少追问 2 层才满足完成判定；stopAppendWhen 监听每层的
 *   isRootCause 字段，一旦某层选了"是根因"就不再允许继续追加新层（避免无休止追问）。
 *   每层字段：why（追问内容）+ evidenceType（依据类型）+ evidence（依据内容）+
 *   dataCredibility（仅当依据类型为 data 时联动出现）+ isRootCause（是否根因）。
 * - createRemedySection()：根因结论分区，把各层标记为"根因"的 why 自动汇总。
 *
 * phases 结构设计意图：whyChain 阶段完成条件是 why 必填且 ≥ minEntries 层；
 * remedy 阶段 completesRecord=true，rootCauseSummary 填好即整份记录完成。
 */
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
    '逐层追问"为什么会发生"（建议 5 层），每层附上证据',
    '确认根因并总结结论',
  ],
  sections: [
    {
      id: 'whyChain',
      title: '5 Why 追问',
      description: '最少追问 2 层，建议 5 层。任意一层确认为根因即可停止。',
      // repeatable: true —— 这是一个"可重复条目"分区，表单会渲染成可追加的条目列表；
      // minEntries: 2 —— 至少要 2 层 Why 才满足该分区的完成判定；
      // stopAppendWhen: 监听每条目的 isRootCause 字段，一旦某层选择
      // value 为 'yes'（是根因），即停止允许添加新条目，避免无休止追问。
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
          // conditionalHints + hintDependsOn：提示文案随 evidenceType 变化 ——
          // 选"数据"就提示补来源，选"观点/情绪"就提醒这不能作为归因依据。
          // hintDependsOn 指定监听哪个字段，conditionalHints 按该字段取值匹配提示语。
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
          // condition 联动：仅当 evidenceType === 'data' 时才显示本字段
          // （数据依据才需要评估可信度，事实/观点/情绪时隐藏）。
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
    // 根因结论分区：confirmedCauseFormula 从 whyChain 各条目里筛选出 isRootCause='yes'
    // 的层，把它们的 why（含数据依据）编号列出作为根因结论初值；
    // rootCauseSummaryFormula 生成一句话总结：经 N 层追问定位根因为最末层根因。
    createRemedySection({
      confirmedCauseDeps: ['whyChain'],
      confirmedCauseFormula: (values) => {
        const chain = Array.isArray(values.whyChain) ? (values.whyChain as Array<Record<string, unknown>>) : [];
        const rootLayers = chain.filter((e) => e?.isRootCause === 'yes');
        const lines: string[] = [];
        rootLayers.forEach((e, i) => {
          lines.push(`${i + 1}. ${typeof e.why === 'string' ? e.why : ''}${e.evidenceType === 'data' && typeof e.evidence === 'string' ? `（数据依据：${e.evidence}）` : typeof e.evidence === 'string' && e.evidence ? `（${e.evidence}）` : ''}`);
        });
        return lines.join('\n');
      },
      rootCauseSummaryDeps: ['whyChain'],
      rootCauseSummaryFormula: (values) => {
        const chain = Array.isArray(values.whyChain) ? (values.whyChain as Array<Record<string, unknown>>) : [];
        const rootLayers = chain.filter((e) => e?.isRootCause === 'yes');
        if (rootLayers.length === 0) return '';
        const last = rootLayers[rootLayers.length - 1];
        return `经 ${chain.length} 层追问，定位根因为：${typeof last.why === 'string' ? last.why : ''}`;
      },
    }),
  ],
  phases: [
    {
      id: 'whyChain',
      label: '5 Why 追问',
      icon: '🔍',
      sectionIndices: [0],
      // completionFields 只要 why —— 对 repeatable 分区，"完成"指
      // 每条目的 why 都填了且条数达到 minEntries(2)。
      completionFields: ['why'],
    },
    {
      id: 'remedy',
      label: '根因结论',
      icon: '🛠️',
      sectionIndices: [1],
      // completesRecord: true —— 根因总结填好，整份记录即视为"已完成"。
      completionFields: ['rootCauseSummary'],
      completesRecord: true,
    },
  ],
};
