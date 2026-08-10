/**
 * 字段渲染器：按 FieldType 分发到具体输入组件，统一处理标签/必填标记/提示语/
 * 错误信息/计算字段展示。用 React.memo 包裹避免无关字段重渲染。
 */
import { memo, useState } from 'react';
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

/** 计算字段的快速复制按钮：点击把生成内容复制到剪贴板，便于在后续流程中粘贴修改。 */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 非安全上下文（如 http 环境）clipboard API 不可用时的降级方案
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-100"
    >
      {copied ? '已复制 ✓' : '复制'}
    </button>
  );
}

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
    const display = result || field.computed.placeholder;
    return (
      <div className="space-y-1">
        <FieldLabel field={field} />
        <div className="flex items-start gap-2">
          <div className="flex-1 whitespace-pre-wrap rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">{display}</div>
          {result && <CopyButton text={result} />}
        </div>
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
