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
  buildCauseScoreTableData,
  buildDefaultKeyFactorMatrix,
  buildKeyFactorRankingTableData,
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
        '逐对判断因素间的因果关系与影响强度，系统将自动完成得分计算与分类。如想跳过逐对判断的繁琐流程，可使用下方快捷通道让 AI 一次性给出所有因果方向+影响强度。',
      fields: [
        {
          id: 'keyFactorAiAnalysis',
          label: '快捷通道：手动调 AI 一次性填入所有因果关系与影响强度',
          type: 'custom',
        },
        {
          id: 'matrix',
          label: `关系矩阵（${KEY_FACTOR_MAX}×${KEY_FACTOR_MAX}）`,
          type: 'table',
          hint: `行 i → 列 j 表示"因素 i 对因素 j"的影响强度。行列号对应上方因素清单顺序（因素 1 → 因素 1…${KEY_FACTOR_MAX}）。`,
          // 因果矩阵的 validation.min 表示"有效单元格数"：KEY_FACTOR_MAX*2 = 30 表示至少
          // 需要 15 对因果方向并填了强度（每对贡献 1 个非零单元格），确保有足够的有效数据。
          validation: { min: KEY_FACTOR_MAX * 2 },
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
            formula: (values) => buildCauseScoreTableData(computeKeyFactors(values)),
          },
        },
        {
          id: 'keyFactorRanking',
          label: 'DEMATEL 要因分析（中心度 + 帕累托 80/20）（自动）',
          type: 'text',
          computed: {
            dependsOn: ['factors', 'matrix'],
            formula: (values) => buildKeyFactorRankingTableData(computeKeyFactors(values)),
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
    createRemedySection({
      confirmedCauseDeps: ['factors', 'matrix'],
      confirmedCauseFormula: (values) => {
        const results = computeKeyFactors(values);
        const sorted = [...results].sort((a, b) => a.score - b.score);
        const root = sorted.filter((r) => r.role === 'root');
        const keyNames = [...results].sort((a, b) => b.centrality - a.centrality).filter((r) => r.isKey).map((r) => r.name);
        const lines: string[] = [];
        root.forEach((r, i) => lines.push(`${i + 1}. ${r.name}：得分 ${r.score}（作为因 ${r.outCount} 次 / 作为果 ${r.inCount} 次）→ 根因`));
        if (keyNames.length) {
          lines.push('');
          lines.push('【DEMATEL 帕累托 80/20 关键因素】');
          keyNames.forEach((n) => lines.push(`★ ${n}`));
        }
        if (sorted[0]) {
          lines.push('');
          lines.push(`相对视角：最源头 → ${sorted[0].name}；最表象 → ${sorted[sorted.length - 1].name}`);
        }
        return lines.join('\n');
      },
      rootCauseSummaryDeps: ['factors', 'matrix'],
      rootCauseSummaryFormula: (values) => {
        const results = computeKeyFactors(values);
        const sorted = [...results].sort((a, b) => a.score - b.score);
        const root = sorted.filter((r) => r.role === 'root');
        const keyNames = [...results].sort((a, b) => b.centrality - a.centrality).filter((r) => r.isKey).map((r) => r.name);
        if (root.length > 0) {
          return `${root.map((r) => r.name).join('、')} 是最源头（得分最低 ${root[0].score}），叠加 DEMATEL 关键因素 ${keyNames.slice(0, 3).join('、') || '—'}，判定为最终根因`;
        }
        if (sorted.length > 0) {
          return `相对视角：最源头为 ${sorted[0].name}（得分 ${sorted[0].score}），最表象为 ${sorted[sorted.length - 1].name}（得分 ${sorted[sorted.length - 1].score}）。`;
        }
        return '';
      },
    }),
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
