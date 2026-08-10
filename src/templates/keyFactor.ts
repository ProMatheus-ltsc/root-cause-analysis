/**
 * 要因分析法（DEMATEL + 帕累托）：处理复杂、非量化、多因素因果关系问题的主推方法。
 *
 * 流程：
 * ① 因素清单 —— 从头脑风暴候选原因中筛选 ≤ 8 个核心因素
 * ② 关系矩阵 —— 两两因素间的因果影响强度（0=无关/1=弱/2=中/4=强）
 * ③ 自动计算中心度（影响度 + 被影响度），按帕累托 80/20 标出关键根因
 * ④ 根因结论 —— 从关键因素中收敛
 */
import type { FormTemplate } from '../types';
import {
  KEY_FACTOR_MAX,
  buildCauseScoreText,
  buildDefaultKeyFactorMatrix,
  buildKeyFactorRankingText,
  computeKeyFactors,
  createRemedySection,
  keyFactorMatrixColumns,
} from './shared';

export const keyFactorTemplate: FormTemplate = {
  id: 'keyFactor',
  name: '要因分析法',
  icon: '🎯',
  description:
    '两套自动分析：① 因 −1/果 +1 得分分类（根因/过因/表因）；② DEMATEL 要因分析（中心度 + 帕累托 80/20 找关键少数根因）。',
  recommended: true,
  scenarios: [
    '复杂、多因素交织的问题，无法简单追问 5 个为什么',
    '非量化原因（文化/组织/管理类），需要系统化梳理因素间的因果关系',
    '需要客观区分根因（源头）/过因（传导）/表因（表象）',
    '需要按帕累托 80/20 找出"关键的少数"根因',
    '从头脑风暴的 ≥ 15 个候选原因中收敛出核心根因',
  ],
  flowSteps: [
    '从头脑风暴清单筛选 ≤ 8 个核心因素',
    '逐对因素填关系强度（0/1/2/4）',
    '自动分析①：因 −1/果 +1 → 根因（得分最低）/ 过因（接近 0）/ 表因（得分最高）',
    '自动分析②：DEMATEL 要因分析（中心度 + 帕累托 80/20）',
    '从两套分析的"根因/关键"因素收敛最终结论',
  ],
  sections: [
    {
      id: 'factors',
      title: '① 因素清单',
      description: `从头脑风暴清单中筛选 ≤ ${KEY_FACTOR_MAX} 个核心因素（顺序对应矩阵行列）。`,
      repeatable: true,
      repeatLabel: '因素 {n}',
      minEntries: 2,
      fields: [
        {
          id: 'name',
          label: '因素名称',
          type: 'text',
          required: true,
          placeholder: '核心因素（如：上游依赖稳定性）',
        },
        {
          id: 'description',
          label: '因素说明',
          type: 'textarea',
          placeholder: '简要说明该因素的具体含义…',
        },
      ],
    },
    {
      id: 'matrix',
      title: '② 因果关系强度矩阵',
      description:
        `行 i 对列 j 的影响强度：` +
        '0=无关｜1=弱（单向弱关联）｜2=中（双向/单向强关联）｜4=强（互为强因果）。' +
        '对角线（自身→自身）填 0。系统按"两两横向、纵向比较是因是果；因 −1 / 果 +1"累计得分，' +
        '得分最低 → 根因，最高 → 表因，接近 0（-2~2）→ 过因。',
      fields: [
        {
          id: 'matrix',
          label: `关系矩阵（${KEY_FACTOR_MAX}×${KEY_FACTOR_MAX}）`,
          type: 'table',
          hint: `行 i → 列 j 表示"因素 i 对因素 j"的影响强度。行列号对应上方因素清单顺序（因素 1 → 因素 1…${KEY_FACTOR_MAX}）。`,
          validation: { min: KEY_FACTOR_MAX },
          defaultValue: buildDefaultKeyFactorMatrix(),
          tableColumns: keyFactorMatrixColumns(),
        },
      ],
    },
    {
      id: 'analysis',
      title: '③ 两套自动分析：得分分类 + DEMATEL 要因分析',
      fields: [
        {
          id: 'causeScore',
          label: '因/果得分分类（因 −1 / 果 +1 → 根因/过因/表因）（自动）',
          type: 'text',
          computed: {
            dependsOn: ['factors', 'matrix'],
            formula: (values) => buildCauseScoreText(computeKeyFactors(values)),
          },
        },
        {
          id: 'keyFactorRanking',
          label: 'DEMATEL 要因分析（中心度 + 帕累托 80/20）（自动）',
          type: 'text',
          computed: {
            dependsOn: ['factors', 'matrix'],
            formula: (values) => buildKeyFactorRankingText(computeKeyFactors(values)),
          },
        },
        {
          id: 'keyFactorsConfirmed',
          label: '最终确认的根因',
          type: 'textarea',
          required: true,
          hint: '从上方"根因"类因素（得分最低、最源头）中，结合实际证据选出 1-3 个作为最终根因；可参考头脑风暴清单中的原因编号/描述。',
          placeholder: '如：上游依赖稳定性（因素 1）——得分最低为源头，且与证据吻合',
        },
      ],
    },
    createRemedySection(),
  ],
  phases: [
    {
      id: 'factors',
      label: '因素清单',
      icon: '📋',
      sectionIndices: [0],
      completionFields: ['name'],
    },
    {
      id: 'matrix',
      label: '关系矩阵',
      icon: '🔢',
      sectionIndices: [1],
      completionFields: ['matrix'],
    },
    {
      id: 'analysis',
      label: '帕累托分析',
      icon: '📊',
      sectionIndices: [2],
      completionFields: ['keyFactorsConfirmed'],
    },
    {
      id: 'remedy',
      label: '根因结论',
      icon: '🛠️',
      sectionIndices: [3],
      completionFields: ['rootCauseSummary'],
      completesRecord: true,
    },
  ],
};