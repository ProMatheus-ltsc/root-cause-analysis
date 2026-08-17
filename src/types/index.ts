/**
 * 全局类型定义：模板驱动表单引擎（字段/分区/阶段/模板）与持久化记录、账户、设置的类型。
 * 该文件是整个应用的"类型契约中心"：所有页面、服务、工具都从这里 import 类型，
 * 保证数据结构在跨文件传递时保持一致。核心概念：表单结构本身也是数据（模板驱动）。
 *
 * 基础类型从 @shared/core 导入，业务特有类型在本文件扩展定义。
 */

// 从 shared-core 导入基础类型（表单引擎核心类型契约）
import type {
  FieldType as SharedFieldType,
  FieldOption as SharedFieldOption,
  TableColumn as SharedTableColumn,
  FieldValidation as SharedFieldValidation,
  FieldCondition as SharedFieldCondition,
  FieldComputed as SharedFieldComputed,
  PhaseConfig as SharedPhaseConfig,
} from '@shared/core';

// 重导出基础类型（保持向后兼容，现有代码无需修改导入路径）
export type FieldType = SharedFieldType;
export type { SharedFieldOption as FieldOption };
export type { SharedFieldValidation as FieldValidation };
export type { SharedFieldCondition as FieldCondition };

/** 模板 id 的联合类型：应用内共 9 种分析模板。 */
export type TemplateId =
  | 'problemWizard'
  | 'keyFactor'
  | 'fiveWhy'
  | 'fishbone'
  | 'timeline'
  | 'comparison'
  | 'systemThinking'
  | 'technicalFault'
  | 'techIncident';

/** 表格字段（type: 'table'）的列定义。扩展 shared-core 的 TableColumn */
export interface TableColumn extends SharedTableColumn {}

/** formula 接收当前表单全部字段值，返回展示用的计算结果（字符串或结构化表格数据）。 */
export interface FieldComputed extends SharedFieldComputed {
  /**
   * 标记字段为"可写自动汇总"：
   * - 表单字段类型仍为 textarea / text（用户可编辑）
   * - 默认值由 formula 动态计算并写入
   * - 用户编辑过该字段后（formState.dirtyFields[name]=true）停止自动覆盖
   */
  editable?: boolean;
}

/** 表单字段：描述"一个问题/一个输入项"的全部配置（渲染方式、校验、显隐、默认值等）。 */
export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: SharedFieldOption[];
  validation?: SharedFieldValidation;
  tableColumns?: TableColumn[];
  priority?: 'required' | 'recommended' | 'optional';
  condition?: SharedFieldCondition;
  hint?: string;
  /** 支持 'auto_today' 等 magic string，由 resolveDefaultValue 解析 */
  defaultValue?: unknown;
  autocomplete?: boolean;
  emphasis?: boolean;
  computed?: FieldComputed;
  conditionalHints?: Record<string, string>;
  hintDependsOn?: string;
  collapsedByDefault?: boolean;
  /** 添加条目时自动填入当前时间（HH:mm 格式） */
  autoTimestamp?: boolean;
}

/** 表单分区：一组字段的容器，可整体折叠，也可声明为"可重复添加条目"的分区。 */
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

/** 分析阶段：把模板的分区切成若干步，完成每个阶段需要填满足够的"完成字段"。 */
export interface PhaseConfig extends SharedPhaseConfig {}

/** 模板定义：一份"表单蓝图"，描述该分析方法的全部字段、分区与阶段。 */
export interface FormTemplate {
  id: TemplateId;
  name: string;
  icon: string;
  description: string;
  /** 推荐模板：复杂/非量化原因的主推方法（要因分析法 + 帕累托）；其他方法作为可选项 */
  recommended?: boolean;
  /** 典型使用场景示例，帮助用户判断该选哪个模板 */
  scenarios?: string[];
  /** 分析流程步骤概述，对应 phases 的用户视角描述 */
  flowSteps?: string[];
  sections: FormSection[];
  phases?: PhaseConfig[];
  timing?: { frequency: string; suggestion: string };
}

/** 问题实体：以问题为导向，独立存储；一个问题可挂多个根因分析记录（FormRecord.problemId）。 */
export interface Problem {
  id: string;
  title: string;
  /** 一句话问题陈述（问题整理区的整理输出） */
  problemStatement: string;
  /** 问题定义/鉴别/整理的全部字段（4W2H 表格、判定、分类、目标、标准陈述等） */
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** 分析记录：一次具体的根因分析会话，绑定一个模板与（可选的）一个问题。 */
export interface FormRecord {
  id: string;
  templateId: TemplateId;
  /** 关联的问题实体 id（问题为导向，一对多） */
  problemId?: string;
  title: string;
  data: Record<string, unknown>;
  status: 'draft' | 'completed';
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

/** 本地账户：只存密码哈希与盐，绝不存明文密码。 */
export interface Account {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

/** 应用级设置（当前仅"重复分析冷却天数"一项）。 */
export interface AppSettings {
  cooldownDays: number;
}
