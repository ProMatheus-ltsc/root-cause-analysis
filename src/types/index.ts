/**
 * 全局类型定义：模板驱动表单引擎（字段/分区/阶段/模板）与持久化记录、账户、设置的类型。
 */

export type TemplateId =
  | 'fiveWhy'
  | 'fishbone'
  | 'timeline'
  | 'comparison'
  | 'systemThinking'
  | 'technicalFault';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'rating'
  | 'table';

export interface FieldOption {
  value: string;
  label: string;
}

export interface TableColumn {
  id: string;
  label: string;
  type?: 'text' | 'select';
  options?: FieldOption[];
  placeholder?: string;
}

export interface FieldValidation {
  min?: number;
  max?: number;
  maxLength?: number;
  pattern?: RegExp;
  patternMessage?: string;
}

export interface FieldCondition {
  dependsOn: string;
  showWhen: string | string[];
}

/** formula 接收当前表单全部字段值，返回展示用的计算结果字符串。 */
export interface FieldComputed {
  dependsOn: string[];
  formula: (values: Record<string, unknown>) => string;
  placeholder?: string;
  errorText?: string;
}

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: FieldOption[];
  validation?: FieldValidation;
  tableColumns?: TableColumn[];
  priority?: 'required' | 'recommended' | 'optional';
  condition?: FieldCondition;
  hint?: string;
  /** 支持 'auto_today' 等 magic string，由 resolveDefaultValue 解析 */
  defaultValue?: unknown;
  autocomplete?: boolean;
  emphasis?: boolean;
  computed?: FieldComputed;
  conditionalHints?: Record<string, string>;
  hintDependsOn?: string;
  collapsedByDefault?: boolean;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  collapsedByDefault?: boolean;
  repeatable?: boolean;
  repeatLabel?: string;
  /** repeatable=true 时，completionFields 判定所需的最少条目数 */
  minEntries?: number;
  /** 当某条目的指定字段值匹配时，停止允许添加新条目（如 5Why 标记根因后不再追问） */
  stopAppendWhen?: { fieldId: string; value: string };
}

export interface PhaseConfig {
  id: string;
  label: string;
  icon: string;
  description?: string;
  sectionIndices: number[];
  completionFields: string[];
  /** 该阶段的 completionFields 满足即可将记录标记为 completed */
  completesRecord?: boolean;
}

export interface FormTemplate {
  id: TemplateId;
  name: string;
  icon: string;
  description: string;
  /** 典型使用场景示例，帮助用户判断该选哪个模板 */
  scenarios?: string[];
  /** 分析流程步骤概述，对应 phases 的用户视角描述 */
  flowSteps?: string[];
  sections: FormSection[];
  phases?: PhaseConfig[];
  timing?: { frequency: string; suggestion: string };
}

export interface FormRecord {
  id: string;
  templateId: TemplateId;
  title: string;
  data: Record<string, unknown>;
  status: 'draft' | 'completed';
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

export interface Account {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

export interface AppSettings {
  cooldownDays: number;
}
