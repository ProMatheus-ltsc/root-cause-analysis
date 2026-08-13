/**
 * 鱼骨图分析法（石川图）：从人机料法环测六大维度全面排查多因素系统性问题。
 *
 * 整体流程（分区 → 阶段）：
 *   ① 六大因素排查：人/机/料/法/环/测 六个可折叠分区，每区含若干
 *      "勾选检查项 + 详情"字段（createCheckItem 生成）和"自动勾选 + 备注"字段，
 *      再在"综合分析"分区评估各维度权重、判定根因；
 *   ② 根因结论：createFishboneRemedySection 自动汇总六大维度发现到根因结论，
 *      完成即整份记录完成。
 */
import type { FormField, FormTemplate } from '../types';
import { buildFishboneSummary, createRemedySection } from './shared';

// 鱼骨图六大维度选项（人/机/料/法/环/测），供"主要原因维度"多选
// 与"各维度权重表"的维度下拉列共用。
const DIMENSION_OPTIONS = [
  { value: 'man', label: '人 (Man)' },
  { value: 'machine', label: '机 (Machine)' },
  { value: 'material', label: '料 (Material)' },
  { value: 'method', label: '法 (Method)' },
  { value: 'environment', label: '环 (Environment)' },
  { value: 'measurement', label: '测 (Measurement)' },
];

// 影响评分选项：1-10 的量化档位（含文字描述），用于权重表的影响评分列。
const LEVEL_OPTIONS = [
  { value: '1', label: '1（极低）' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4（中低）' },
  { value: '5', label: '5（中）' },
  { value: '6', label: '6' },
  { value: '7', label: '7（中高）' },
  { value: '8', label: '8' },
  { value: '9', label: '9' },
  { value: '10', label: '10（极高）' },
];

/**
 * 生成一对"检查项"字段（勾选框 + 详情框）：
 * - 勾选框 id = `${prefix}Checked`，如 manSkillGapChecked；
 * - 详情框 id = `${prefix}Detail`，仅当勾选框被勾选时显示。
 *
 * 这是典型的 condition 联动：详情框的 condition.dependsOn 指向勾选框，
 * showWhen:'true' 表示"勾选框值为 true（勾选）时才展示"，未勾选的检查项
 * 不占填写空间，表单更清爽。
 *
 * @param prefix            字段 id 前缀，用于派生 checkboxId 与 detailId，保证同模板内唯一
 * @param label             检查项文案（如"人员技能不足？"）
 * @param detailPlaceholder 详情框占位提示，引导用户具体描述观察到的现象
 * @returns 两个 FormField 组成的数组，可直接用展开符并入 section.fields
 */
function createCheckItem(prefix: string, label: string, detailPlaceholder: string): FormField[] {
  const checkboxId = `${prefix}Checked`;
  return [
    { id: checkboxId, label, type: 'checkbox' },
    {
      id: `${prefix}Detail`,
      label: `${label}——详情`,
      type: 'textarea',
      placeholder: detailPlaceholder,
      condition: { dependsOn: checkboxId, showWhen: 'true' },
    },
  ];
}

/**
 * 鱼骨图分析法模板。
 *
 * sections 结构设计意图：
 * - 六个维度分区（man/machine/material/method/environment/measurement）结构完全一致：
 *   每个分区由 createCheckItem 生成 2 个"勾选+详情"检查项、1 个 custom 类型的
 *   AutoCheck 字段（"从问题头脑风暴自动勾选"，由外部逻辑把头脑风暴候选中该维度的
 *   原因自动勾选出来）以及 1 个 Notes 备注框。collapsedByDefault:true 让分区默认折叠，
 *   避免六个长分区同时展开造成页面过长。
 * - comprehensiveAnalysis（综合分析）：primaryDimensions 多选主要原因维度，
 *   weightTable 用表格按 1-10 评分各维度影响权重，rootCauseJudgement 汇总判定根因。
 * - createFishboneRemedySection()：鱼骨图专属的根因结论分区（见函数注释）。
 *
 * phases 结构设计意图：sixFactors 阶段覆盖前 7 个分区（索引 0-6），
 * 完成条件只看 rootCauseJudgement（根因判定），因为检查项/权重是过程数据；
 * remedy 阶段覆盖根因结论分区，completionFields 只要求 rootCauseSummary，
 * 且 completesRecord=true —— 根因总结填好即整份记录完成。
 */
export const fishboneTemplate: FormTemplate = {
  id: 'fishbone',
  name: '鱼骨图分析法',
  icon: '🐟',
  description: '从人机料法环测六大维度系统性排查多因素问题',
  scenarios: [
    '新开的餐厅客流量持续下降，不确定是选址、菜品、服务还是营销的问题',
    '家庭装修工期严重延误，涉及设计方、施工方、材料供应等多方因素',
    '公司员工离职率突然升高，想从薪资、文化、管理、发展等多维度排查',
  ],
  flowSteps: [
    '按人/机/料/法/环/测六大维度逐项排查，勾选并记录发现',
    '综合评估各维度影响权重，判定主要根因',
    '确认根因并总结结论',
  ],
  sections: [
    {
      id: 'man',
      title: '人 (Man)',
      collapsedByDefault: true,
      fields: [
        ...createCheckItem('manSkillGap', '人员技能不足？', '具体观察：哪类人员、缺哪类技能/熟练度？如"新讲师对九年级物理重难点不熟"'),
        ...createCheckItem('manResponsibility', '职责不清？', '哪些角色边界模糊？如"谁负责对接产品部资料需求无明确 owner"'),
        ...createCheckItem('manTraining', '培训缺失？', '哪些培训未覆盖？如"产品部资料使用培训覆盖不到广分一线教师"'),
        { id: 'manAutoCheck', label: '从问题头脑风暴自动勾选', type: 'custom' },
        { id: 'manNotes', label: '本维度发现与备注', type: 'textarea', placeholder: '例：在"人"这个维度观察到的整体现象、跨多个检查项的共性原因、或额外补充说明…' },
      ],
    },
    {
      id: 'machine',
      title: '机 (Machine)',
      collapsedByDefault: true,
      fields: [
        ...createCheckItem('machineFault', '工具/系统是否故障？', '具体故障表现？如"备课系统搜索接口报错、内容分发调用量为0"'),
        ...createCheckItem('machineConfig', '环境配置问题？', '配置不匹配的具体点？如"教师端备课入口未接入产品部资料库"'),
        { id: 'machineAutoCheck', label: '从问题头脑风暴自动勾选', type: 'custom' },
        { id: 'machineNotes', label: '本维度发现与备注', type: 'textarea', placeholder: '例：在"机"这个维度观察到的整体现象、跨多个检查项的共性原因、或额外补充说明…' },
      ],
    },
    {
      id: 'material',
      title: '料 (Material)',
      collapsedByDefault: true,
      fields: [
        ...createCheckItem('materialQuality', '输入数据/物料质量？', '质量问题的具体表现？如"九年级物理资料知识点/题型覆盖率不足不足"'),
        ...createCheckItem('materialUpstream', '上游依赖问题？', '依赖方是谁、问题是什么？如"产品部资料库迁移后未对接教师端"'),
        { id: 'materialAutoCheck', label: '从问题头脑风暴自动勾选', type: 'custom' },
        { id: 'materialNotes', label: '本维度发现与备注', type: 'textarea', placeholder: '例：在"料"这个维度观察到的整体现象、跨多个检查项的共性原因、或额外补充说明…' },
      ],
    },
    {
      id: 'method',
      title: '法 (Method)',
      collapsedByDefault: true,
      fields: [
        ...createCheckItem('methodMissing', '流程/规范缺失？', '哪些环节缺流程？如"备课流程未要求嵌入产品部资料取材"'),
        ...createCheckItem('methodWrong', '方法论错误？', '当前做法错在哪？如"资料产出后没有推送/宣导闭环"'),
        { id: 'methodAutoCheck', label: '从问题头脑风暴自动勾选', type: 'custom' },
        { id: 'methodNotes', label: '本维度发现与备注', type: 'textarea', placeholder: '例：在"法"这个维度观察到的整体现象、跨多个检查项的共性原因、或额外补充说明…' },
      ],
    },
    {
      id: 'environment',
      title: '环 (Environment)',
      collapsedByDefault: true,
      fields: [
        ...createCheckItem('envChange', '外部环境变化？', '哪些外部条件变了？如"广分竞争产品形态调整、对资料要求改变"'),
        ...createCheckItem('envPressure', '时间压力？', '压力来自哪里、影响什么？如"学期紧、备课无时间试用新产品"'),
        { id: 'envAutoCheck', label: '从问题头脑风暴自动勾选', type: 'custom' },
        { id: 'envNotes', label: '本维度发现与备注', type: 'textarea', placeholder: '例：在"环"这个维度观察到的整体现象、跨多个检查项的共性原因、或额外补充说明…' },
      ],
    },
    {
      id: 'measurement',
      title: '测 (Measurement)',
      collapsedByDefault: true,
      fields: [
        ...createCheckItem('measureMissing', '监控/度量缺失？', '没有监控什么指标？如"资料使用率指标未接监控面板"'),
        ...createCheckItem('measureDefinition', '指标定义不合理？', '当前指标定义哪里不对？如"使用率只统计点击不计实际备课采纳"'),
        { id: 'measureAutoCheck', label: '从问题头脑风暴自动勾选', type: 'custom' },
        { id: 'measureNotes', label: '本维度发现与备注', type: 'textarea', placeholder: '例：在"测"这个维度观察到的整体现象、跨多个检查项的共性原因、或额外补充说明…' },
      ],
    },
    {
      id: 'comprehensiveAnalysis',
      title: '综合分析',
      fields: [
        { id: 'primaryDimensions', label: '主要原因维度', type: 'checkbox', options: DIMENSION_OPTIONS },
        {
          id: 'weightTable',
          label: '各维度权重与影响度评估',
          type: 'table',
          hint: 'MECE：各维度相互独立、不重叠；评分为 1-10 的量化分（数值越高影响越大）；关键发现要可验证',
          // 权重表三列：dimension 选维度、impactLevel 选 1-10 影响评分、
          // keyFinding 填该维度下可验证的关键发现，作为自动汇总的素材之一。
          tableColumns: [
            { id: 'dimension', label: '维度', type: 'select', options: DIMENSION_OPTIONS },
            { id: 'impactLevel', label: '影响评分（1-10）', type: 'select', options: LEVEL_OPTIONS },
            { id: 'keyFinding', label: '关键发现', type: 'text' },
          ],
        },
        { id: 'rootCauseJudgement', label: '根因判定', type: 'textarea', required: true, placeholder: '综合各维度分析，判定最主要的根因是什么' },
      ],
    },
    createFishboneRemedySection(),
  ],
  phases: [
    {
      id: 'sixFactors',
      label: '六大因素排查',
      icon: '🔍',
      // sectionIndices=[0..6]：六个维度分区 + 综合分析分区。
      // completionFields 只需 rootCauseJudgement —— 检查项/权重表是过程性数据，
      // 是否完成以"根因判定"这一收敛性输出为准。
      sectionIndices: [0, 1, 2, 3, 4, 5, 6],
      completionFields: ['rootCauseJudgement'],
    },
    {
      id: 'remedy',
      label: '根因结论',
      icon: '🛠️',
      sectionIndices: [7],
      // completesRecord: true —— rootCauseSummary（根因总结）填好后整份记录即完成
      completionFields: ['rootCauseSummary'],
      completesRecord: true,
    },
  ],
};

/**
 * 鱼骨图专属的根因结论 section：`confirmedCause` 用 computed field 自动汇总六大维度发现，
 * 避免让用户手动复制。
 */
function createFishboneRemedySection() {
  // 维度 value → 中文标签 的映射表，供自动汇总时把 primaryDimensions/weightTable
  // 里的维度 id 转成可读的中文名展示。
  const labelMap: Record<string, string> = {
    man: '人 (Man)', machine: '机 (Machine)', material: '料 (Material)',
    method: '法 (Method)', environment: '环 (Environment)', measurement: '测 (Measurement)',
  };
  // 先复用公共的 createRemedySection 生成基础根因结论分区，并传入：
  // - rootCauseSummaryDeps / rootCauseSummaryFormula：根因总结由
  //   primaryDimensions（主要维度）、weightTable（权重表）、rootCauseJudgement（根因判定）
  //   三个字段自动拼装，前两名权重最高的维度优先展示。
  const section = createRemedySection({
    rootCauseSummaryDeps: ['primaryDimensions', 'weightTable', 'rootCauseJudgement'],
    rootCauseSummaryFormula: (values) => {
      const judgement = typeof values.rootCauseJudgement === 'string' ? values.rootCauseJudgement.trim() : '';
      const dims = Array.isArray(values.primaryDimensions) ? (values.primaryDimensions as string[]) : [];
      const wts = Array.isArray(values.weightTable) ? (values.weightTable as Array<Record<string, unknown>>) : [];
      // 从权重表里取"填了维度名 + 关键发现"的行，按出现顺序截取前 3 条
      const topWeights = wts
        .map((w) => ({ dimension: typeof w?.dimension === 'string' ? w.dimension : '', key: typeof w?.keyFinding === 'string' ? w.keyFinding : '' }))
        .filter((w) => w.dimension && w.key)
        .slice(0, 3);
      const lines: string[] = [];
      if (dims.length > 0) {
        lines.push(`主要维度：${dims.map((d) => labelMap[d] || d).join('、')}`);
      }
      if (topWeights.length > 0) {
        lines.push(`关键发现：${topWeights.map((w) => `${labelMap[w.dimension] || w.dimension}：${w.key}`).join('；')}`);
      }
      if (judgement) {
        lines.push(`根因判定：${judgement}`);
      } else if (dims.length === 0 && topWeights.length === 0) {
        // 三个素材都没有时返回空串，避免展示无意义占位
        return '';
      }
      return lines.join('\n');
    },
  });
  // 把公共分区里的 confirmedCause（从候选原因中确认的根因）替换成鱼骨图专用版本：
  // - 类型改为 textarea 且 rows:8，作为可读性更好的多行展示
  // - computed.dependsOn 监听六大维度，formula 调用 buildFishboneSummary 把
  //   六个维度勾选/填写/头脑风暴引用的发现自动汇总成 markdown 文本
  // - editable: true 表示用户仍可手动编辑修改，编辑后不再被自动覆盖
  const fields = section.fields.map((f) => {
    if (f.id === 'confirmedCause') {
      return {
        ...f,
        type: 'textarea' as const,
        rows: 8,
        computed: {
          dependsOn: ['man', 'machine', 'material', 'method', 'environment', 'measurement'],
          formula: (values: Record<string, unknown>) => buildFishboneSummary(values),
          editable: true,
        },
      } as FormField;
    }
    return f;
  });
  return { ...section, fields };
}
