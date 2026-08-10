/**
 * 鱼骨图分析法（石川图）：从人机料法环测六大维度全面排查多因素系统性问题。
 */
import type { FormField, FormTemplate } from '../types';
import { createActionSection, createProblemDefinitionSection, createProblemIdentificationSection, createRemedySection } from './shared';

const DIMENSION_OPTIONS = [
  { value: 'man', label: '人 (Man)' },
  { value: 'machine', label: '机 (Machine)' },
  { value: 'material', label: '料 (Material)' },
  { value: 'method', label: '法 (Method)' },
  { value: 'environment', label: '环 (Environment)' },
  { value: 'measurement', label: '测 (Measurement)' },
];

const LEVEL_OPTIONS = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];

function createCheckItem(prefix: string, label: string): FormField[] {
  const checkboxId = `${prefix}Checked`;
  return [
    { id: checkboxId, label, type: 'checkbox' },
    {
      id: `${prefix}Detail`,
      label: `${label}——详情`,
      type: 'textarea',
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
    '鉴别并清晰描述问题，界定影响范围',
    '按人/机/料/法/环/测六大维度逐项排查，勾选并记录发现',
    '综合评估各维度影响权重，判定主要根因',
    '确认根因并总结结论',
  ],
  sections: [
    createProblemDefinitionSection([
      {
        id: 'problemDomain',
        label: '问题领域',
        type: 'radio',
        options: [
          { value: 'technical', label: '技术' },
          { value: 'management', label: '管理' },
          { value: 'process', label: '流程' },
          { value: 'product', label: '产品' },
          { value: 'operation', label: '运营' },
          { value: 'other', label: '其他' },
        ],
      },
    ]),
    createProblemIdentificationSection(),
    {
      id: 'man',
      title: '人 (Man)',
      collapsedByDefault: true,
      fields: [
        ...createCheckItem('manSkillGap', '人员技能不足？'),
        ...createCheckItem('manResponsibility', '职责不清？'),
        ...createCheckItem('manTraining', '培训缺失？'),
      ],
    },
    {
      id: 'machine',
      title: '机 (Machine)',
      collapsedByDefault: true,
      fields: [
        ...createCheckItem('machineFault', '工具/系统是否故障？'),
        ...createCheckItem('machineConfig', '环境配置问题？'),
      ],
    },
    {
      id: 'material',
      title: '料 (Material)',
      collapsedByDefault: true,
      fields: [
        ...createCheckItem('materialQuality', '输入数据/物料质量？'),
        ...createCheckItem('materialUpstream', '上游依赖问题？'),
      ],
    },
    {
      id: 'method',
      title: '法 (Method)',
      collapsedByDefault: true,
      fields: [
        ...createCheckItem('methodMissing', '流程/规范缺失？'),
        ...createCheckItem('methodWrong', '方法论错误？'),
      ],
    },
    {
      id: 'environment',
      title: '环 (Environment)',
      collapsedByDefault: true,
      fields: [
        ...createCheckItem('envChange', '外部环境变化？'),
        ...createCheckItem('envPressure', '时间压力？'),
      ],
    },
    {
      id: 'measurement',
      title: '测 (Measurement)',
      collapsedByDefault: true,
      fields: [
        ...createCheckItem('measureMissing', '监控/度量缺失？'),
        ...createCheckItem('measureDefinition', '指标定义不合理？'),
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
    createRemedySection(),
    createActionSection(),
  ],
  phases: [
    {
      id: 'problemDefinition',
      label: '问题鉴别',
      icon: '🎯',
      sectionIndices: [0, 1],
      completionFields: ['title', 'problemStatement', 'problemCriteria', 'problemType', 'symptom', 'isWhat', 'isWho', 'isWhen', 'isWhere', 'isHow', 'isExtent', 'gapTarget'],
    },
    {
      id: 'sixFactors',
      label: '六大因素排查',
      icon: '🔍',
      sectionIndices: [2, 3, 4, 5, 6, 7, 8],
      completionFields: ['rootCauseJudgement'],
    },
    {
      id: 'remedy',
      label: '根因结论',
      icon: '🛠️',
      sectionIndices: [9],
      completionFields: ['rootCauseSummary'],
    },
    {
      id: 'action',
      label: '对策实施',
      icon: '✅',
      sectionIndices: [10],
      completionFields: ['measure'],
      completesRecord: true,
    },
  ],
};
