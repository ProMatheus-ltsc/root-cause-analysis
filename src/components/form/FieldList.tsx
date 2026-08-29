/**
 * 渲染一组字段（用于非重复段的整体字段，或重复段单个条目的字段），
 * 每个字段外包一层 ConditionalField 处理显示/隐藏。
 * 关键点：
 * - basePath 决定字段在表单值树中的路径前缀：非重复段传空串，重复段传 '下标.'；
 * - 带 autocomplete 标记的字段会调用 collectAutocompleteValues 汇总历史记录，
 *   把收集到的候选词作为 suggestions 传给输入组件做自动补全。
 */
import type { FormField, FormRecord, Problem, TemplateId } from '../../types';
import { FieldRenderer } from '../FieldRenderer';
import { ConditionalField } from './ConditionalField';
import { collectAutocompleteValues } from '../../services/suggestions';

/** FieldList 的 props：fields 是本组要渲染的模板字段定义；其余是逐层透传给输入组件的表单上下文。 */
interface FieldListProps {
  fields: FormField[];
  basePath: string;
  disabled: boolean;
  templateId: TemplateId;
  historyRecords: FormRecord[];
  problem?: Problem;
}

/**
 * 字段列表容器：把 fields 数组按模板定义顺序逐字段渲染成"标签 + 输入控件"。
 * - 每个字段先包一层 ConditionalField：命中依赖条件才展示，否则整块不渲染；
 * - 实际输入控件由 FieldRenderer 按 field.type 分发到 FieldInputs 中对应的组件；
 * - 多行文本（textarea）和表格（table）字段独占两列（field-span-2，容器查询生效）。
 */
export function FieldList({ fields, basePath, disabled, templateId, historyRecords, problem }: FieldListProps) {
  return (
    <>
      {fields.map((field) => (
        // 每个字段都用 ConditionalField 包裹：字段定义了 condition 且未命中时整块隐藏
        <ConditionalField key={field.id} condition={field.condition} basePath={basePath}>
          <div className={field.type === 'textarea' || field.type === 'table' ? 'field-span-2' : ''}>
            <FieldRenderer
              field={field}
              name={`${basePath}${field.id}`}
              disabled={disabled}
              // 只有声明了 autocomplete 的字段才去历史记录里收集候选词，避免无谓计算
              suggestions={field.autocomplete ? collectAutocompleteValues(templateId, field.id, historyRecords) : undefined}
              problem={problem}
            />
          </div>
        </ConditionalField>
      ))}
    </>
  );
}
