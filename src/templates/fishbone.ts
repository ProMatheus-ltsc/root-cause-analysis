/**
 * 鱼骨图分析法（石川图）：从人机料法环测六大维度全面排查多因素系统性问题。
 */
import type { FormField, FormTemplate } from '../types';
import { buildFishboneSummary, createRemedySection } from './shared';

const DIMENSION_OPTIONS = [
  { value: 'man', label: '人 (Man)' },
  { value: 'machine', label: '机 (Machine)' },
  { value: 'material', label: '料 (Material)' },
  { value: 'method', label: '法 (Method)' },
  { value: 'environment', label: '环 (Environment)' },
  { value: 'measurement', label: '测 (Measurement)' },
];

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
      sectionIndices: [0, 1, 2, 3, 4, 5, 6],
      completionFields: ['rootCauseJudgement'],
    },
    {
      id: 'remedy',
      label: '根因结论',
      icon: '🛠️',
      sectionIndices: [7],
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
  const section = createRemedySection();
  const fields = section.fields.map((f) => {
    if (f.id === 'confirmedCause') {
      return {
        ...f,
        label: '六大维度的发现汇总',
        hint: '系统自动汇总上面六大维度里的发现与备注，无需手动填写；如有候选原因引用（脑暴）也会显示在此。',
        type: 'text' as const,
        computed: {
          dependsOn: ['man', 'machine', 'material', 'method', 'environment', 'measurement'],
          formula: (values: Record<string, unknown>) => buildFishboneSummary(values),
        },
      } as FormField;
    }
    return f;
  });
  return { ...section, fields };
}
