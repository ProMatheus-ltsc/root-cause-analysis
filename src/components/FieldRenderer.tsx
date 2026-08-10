/**
 * 字段渲染器：按 FieldType 分发到具体输入组件，统一处理标签/必填标记/提示语/
 * 错误信息/计算字段展示。用 React.memo 包裹避免无关字段重渲染。
 */
import { memo } from 'react';
import { useFormContext } from 'react-hook-form';
import clsx from 'clsx';
import type { FormField } from '../types';
import {
  CheckboxInput,
  DateInput,
  NumberInput,
  RadioGroupInput,
  RatingInput,
  SelectInput,
  TableFieldInput,
  TextInput,
  TextareaInput,
} from './form/FieldInputs';

function getErrorAtPath(errors: Record<string, unknown>, path: string): { message?: string } | undefined {
  const segments = path.split('.');
  let current: unknown = errors;
  for (const segment of segments) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current as { message?: string } | undefined;
}

interface FieldRendererProps {
  field: FormField;
  name: string;
  disabled?: boolean;
  suggestions?: string[];
}

function FieldRendererImpl({ field, name, disabled, suggestions }: FieldRendererProps) {
  const { watch, formState } = useFormContext();
  const values = watch();
  const error = getErrorAtPath(formState.errors as Record<string, unknown>, name);

  if (field.computed) {
    const result = field.computed.formula(values as Record<string, unknown>);
    return (
      <div className="space-y-1">
        <FieldLabel field={field} />
        <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">{result || field.computed.placeholder}</div>
      </div>
    );
  }

  const hint = field.hintDependsOn && field.conditionalHints ? field.conditionalHints[String(values[field.hintDependsOn])] : field.hint;

  if (field.type === 'checkbox' && !field.options) {
    return (
      <div className="space-y-1">
        <CheckboxInput field={field} name={name} disabled={disabled} />
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <FieldLabel field={field} />
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
      <FieldInput field={field} name={name} disabled={disabled} suggestions={suggestions} />
      {error?.message && <p className="text-xs text-rose-600">{error.message}</p>}
    </div>
  );
}

function FieldLabel({ field }: { field: FormField }) {
  return (
    <label className={clsx('block text-sm font-medium text-slate-700', field.emphasis && 'text-base text-slate-900')}>
      {field.label}
      {field.required && <span className="ml-1 text-rose-500">*</span>}
    </label>
  );
}

function FieldInput({ field, name, disabled, suggestions }: FieldRendererProps) {
  switch (field.type) {
    case 'textarea':
      return <TextareaInput field={field} name={name} disabled={disabled} />;
    case 'number':
      return <NumberInput field={field} name={name} disabled={disabled} />;
    case 'date':
      return <DateInput field={field} name={name} disabled={disabled} />;
    case 'select':
      return <SelectInput field={field} name={name} disabled={disabled} />;
    case 'radio':
      return <RadioGroupInput field={field} name={name} disabled={disabled} />;
    case 'checkbox':
      return <CheckboxInput field={field} name={name} disabled={disabled} />;
    case 'rating':
      return <RatingInput field={field} name={name} disabled={disabled} />;
    case 'table':
      return <TableFieldInput field={field} name={name} disabled={disabled} />;
    case 'text':
    default:
      return <TextInput field={field} name={name} disabled={disabled} suggestions={suggestions} />;
  }
}

export const FieldRenderer = memo(FieldRendererImpl);
