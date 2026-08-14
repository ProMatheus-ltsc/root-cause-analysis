/**
 * 要因分析法（DEMATEL + 帕累托）：处理复杂、非量化、多因素因果关系问题的主推方法。
 *
 * 流程：
 * ① 因素清单 —— 从头脑风暴候选原因中筛选核心因素
 * ② 关系矩阵 —— 两两因素间的因果影响强度（0=无关/1=弱/2=中/4=强）
 * ③ 自动分析 —— 区分源头/传导/表象，并标出优先关注的关键原因
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

/**
 * 要因分析法模板（DEMATEL + 帕累托，recommended 主推方法）。
 *
 * sections 结构设计意图（四步走）：
 *   ① factors（因素清单）：repeatable 分区，从头脑风暴候选中筛出核心因素
 *      （最多 KEY_FACTOR_MAX=15 个），顺序决定后面矩阵的行列号；
 *   ② matrix（关系矩阵）：keyFactorAiAnalysis 是 custom 字段（快捷通道，可让 AI
 *      一次性填好所有因果方向与强度）；matrix 表格是 15×15 固定大小，
 *      validation.min=KEY_FACTOR_MAX*2 表示"至少 30 个有效非零单元格"才算填够；
 *   ③ analysis（自动分析结果）：causeScore（因果定位）与 keyFactorRanking
 *      （关键因素排序）都是 computed 字段，依赖 factors + matrix，
 *      自动调用 computeKeyFactors 计算并渲染成带颜色的结构化表格；
 *   ④ createRemedySection()：根因结论，自动汇总"最源头因素 + 优先关注的关键原因"。
 *
 * phases 结构设计意图：因素清单 → 关系矩阵 → 结果分析 → 根因结论 四个阶段，
 * 每阶段 completionFields 列出"必须填好"的字段；最后一个阶段 completesRecord=true，
 * 根因总结填好即整份记录完成。
 */
export const keyFactorTemplate: FormTemplate = {
  id: 'keyFactor',
  name: '要因分析法',
  icon: '🎯',
  description:
    '通过两两对比因素间的因果影响，自动帮你区分：最源头的原因（根因）、中间传导的原因、最表面的现象，并标出优先关注的关键原因，据此收敛结论。',
  recommended: true,
  scenarios: [
    '复杂、多因素交织的问题，无法简单追问 5 个为什么',
    '非量化原因（文化/组织/管理类），需要系统化梳理因素间的因果关系',
    '需要客观区分根因（源头）/过因（传导）/表因（表象）',
    '需要从多个原因中找出"关键的少数"，优先解决最有杠杆作用的根因',
    '从头脑风暴的多个候选原因中收敛出核心根因',
  ],
  flowSteps: [
    '从头脑风暴清单筛选核心因素（最多 15 个）',
    '逐对判断因素间是否有因果影响、影响有多强（0 无关 / 1 弱 / 2 中 / 4 强）',
    '系统自动区分：最源头（根因）/ 中间传导（过因）/ 最表面（表因）',
    '系统自动标出优先关注的关键原因',
    '从"根因"与"关键原因"中收敛最终结论',
  ],
  sections: [
    {
      id: 'factors',
      title: '① 因素清单',
      description: `从头脑风暴清单中筛选核心因素（最多 ${KEY_FACTOR_MAX} 个，顺序对应矩阵行列）。`,
      // repeatable 分区：每个因素一条，顺序即矩阵的行列号（因素 1 对应第 1 行/第 1 列）。
      // minEntries: 2 —— 至少 2 个因素才能构成"两两关系"，否则矩阵无意义。
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
        '逐对判断因素间"谁影响谁、影响多强"。填完矩阵后，系统会自动告诉你：哪些因素是源头、哪些只是表象。',
      fields: [
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
      title: '③ 自动分析结果',
      fields: [
        {
          // computed 字段（不可编辑）：依赖 factors + matrix，
          // 每次任一依赖字段变化都重新调用 computeKeyFactors 计算并渲染结果表格。
          id: 'causeScore',
          label: '因果定位（自动）：区分最源头 / 中间传导 / 最表面',
          type: 'text',
          computed: {
            dependsOn: ['factors', 'matrix'],
            formula: (values) => buildCauseScoreTableData(computeKeyFactors(values)),
          },
        },
        {
          id: 'keyFactorRanking',
          label: '关键因素排序（自动）：优先关注哪些原因',
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
          hint: '从上方"最源头"的因素中，结合实际证据选出 1-3 个作为最终根因；可参考头脑风暴清单中的原因编号/描述。',
          placeholder: '如：上游依赖稳定性（因素 1）——位于最源头，且与证据吻合',
        },
      ],
    },
    // 根因结论分区：confirmedCauseFormula 把"最源头（root 角色）的因素"编号列出，
    // 再附上"优先关注的关键原因"（帕累托 isKey 项）与相对视角；
    // rootCauseSummaryFormula 生成一句话总结（根因 + 关键原因 → 最终判定）。
    createRemedySection({
      confirmedCauseDeps: ['factors', 'matrix'],
      confirmedCauseFormula: (values) => {
        const results = computeKeyFactors(values);
        const sorted = [...results].sort((a, b) => a.score - b.score);
        const root = sorted.filter((r) => r.role === 'root');
        const keyNames = [...results].sort((a, b) => b.centrality - a.centrality).filter((r) => r.isKey).map((r) => r.name);
        const lines: string[] = [];
        root.forEach((r, i) => lines.push(`${i + 1}. ${r.name}（影响其他因素 ${r.outCount} 次，被其他因素影响 ${r.inCount} 次）→ 最源头`));
        if (keyNames.length) {
          lines.push('');
          lines.push('【优先关注的关键原因】');
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
          return `${root.map((r) => r.name).join('、')} 位于因果关系的最源头，叠加优先关注的关键原因 ${keyNames.slice(0, 3).join('、') || '—'}，判定为最终根因`;
        }
        if (sorted.length > 0) {
          return `相对视角：最源头为 ${sorted[0].name}，最表象为 ${sorted[sorted.length - 1].name}。`;
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
      // 完成条件看 repeatable 条目字段 name（因素名称需填且 ≥ minEntries 条）。
      completionFields: ['name'],
    },
    {
      id: 'matrix',
      label: '关系矩阵',
      icon: '🔢',
      sectionIndices: [1],
      // 完成需 matrix 有效非零单元格达到 validation.min 要求。
      completionFields: ['matrix'],
    },
    {
      id: 'analysis',
      label: '结果分析',
      icon: '📊',
      sectionIndices: [2],
      // 完成以用户手填的 keyFactorsConfirmed（最终确认的根因）为准，
      // 自动分析结果（computed）不算完成条件。
      completionFields: ['keyFactorsConfirmed'],
    },
    {
      id: 'remedy',
      label: '根因结论',
      icon: '🛠️',
      sectionIndices: [3],
      // completesRecord: true —— rootCauseSummary（根因总结）填好即整份记录完成。
      completionFields: ['rootCauseSummary'],
      completesRecord: true,
    },
  ],
};
