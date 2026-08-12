/**
 * 渲染一组字段（用于非重复段的整体字段，或重复段单个条目的字段），
 * 每个字段外包一层 ConditionalField 处理显示/隐藏。
 */
import type { FormField, FormRecord, Problem, TemplateId } from '../../types';
import { FieldRenderer } from '../FieldRenderer';
import { ConditionalField } from './ConditionalField';
import { collectAutocompleteValues } from '../../services/suggestions';

interface FieldListProps {
  fields: FormField[];
  basePath: string;
  disabled: boolean;
  templateId: TemplateId;
  historyRecords: FormRecord[];
  problem?: Problem;
}

export function FieldList({ fields, basePath, disabled, templateId, historyRecords, problem }: FieldListProps) {
  return (
    <>
      {fields.map((field) => (
        <ConditionalField key={field.id} condition={field.condition} basePath={basePath}>
          <div className={field.type === 'textarea' || field.type === 'table' ? 'sm:col-span-2' : ''}>
            <FieldRenderer
              field={field}
              name={`${basePath}${field.id}`}
              disabled={disabled}
              suggestions={field.autocomplete ? collectAutocompleteValues(templateId, field.id, historyRecords) : undefined}
              problem={problem}
            />
          </div>
        </ConditionalField>
      ))}
    </>
  );
}
