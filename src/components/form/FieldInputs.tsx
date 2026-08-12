/**
 * 各 FieldType 对应的具体输入组件。均通过 useFormContext 拿到 register/control，
 * 用点路径 name（如 sectionId.0.fieldId）直接映射到表单值树。
 */
import { useFieldArray, useFormContext, useController, type Control } from 'react-hook-form';
import type { FormField } from '../../types';

export const INPUT_CLASS =
  'w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-400 focus:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-surface-100 disabled:text-text-tertiary transition';

type ValidationRules = Record<string, unknown>;

function buildValidationRules(field: FormField): ValidationRules {
  const rules: ValidationRules = {};
  if (field.required) rules.required = `${field.label}为必填项`;
  if (field.validation?.maxLength !== undefined) {
    rules.maxLength = { value: field.validation.maxLength, message: `不超过 ${field.validation.maxLength} 字` };
  }
  if (field.validation?.pattern) {
    rules.pattern = { value: field.validation.pattern, message: field.validation.patternMessage ?? '格式不正确' };
  }
  if (field.type === 'number') {
    if (field.validation?.min !== undefined) rules.min = { value: field.validation.min, message: `不小于 ${field.validation.min}` };
    if (field.validation?.max !== undefined) rules.max = { value: field.validation.max, message: `不大于 ${field.validation.max}` };
  }
  return rules;
}

interface InputProps {
  field: FormField;
  name: string;
  disabled?: boolean;
  suggestions?: string[];
}

export function TextInput({ field, name, disabled, suggestions }: InputProps) {
  const { register, formState: { errors } } = useFormContext();
  const listId = suggestions?.length ? `${name}-suggestions` : undefined;
  const errorId = `${name}-error`;
  const hasError = !!errors[name];
  return (
    <>
      <input
        type="text"
        className={INPUT_CLASS}
        placeholder={field.placeholder}
        disabled={disabled}
        list={listId}
        aria-required={field.required || undefined}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? errorId : undefined}
        {...register(name, buildValidationRules(field))}
      />
      {listId && (
        <datalist id={listId}>
          {suggestions!.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </>
  );
}

export function TextareaInput({ field, name, disabled }: InputProps) {
  const { register, formState: { errors } } = useFormContext();
  const hasError = !!errors[name];
  return (
    <textarea
      className={INPUT_CLASS}
      rows={4}
      placeholder={field.placeholder}
      disabled={disabled}
      aria-required={field.required || undefined}
      aria-invalid={hasError || undefined}
      aria-describedby={hasError ? `${name}-error` : undefined}
      {...register(name, buildValidationRules(field))}
    />
  );
}

export function NumberInput({ field, name, disabled }: InputProps) {
  const { register } = useFormContext();
  return (
    <input
      type="number"
      className={INPUT_CLASS}
      placeholder={field.placeholder}
      disabled={disabled}
      {...register(name, { ...buildValidationRules(field), valueAsNumber: true })}
    />
  );
}

export function DateInput({ field, name, disabled }: InputProps) {
  const { register } = useFormContext();
  return <input type="date" className={INPUT_CLASS} disabled={disabled} {...register(name, buildValidationRules(field))} />;
}

export function DateTimeInput({ field, name, disabled }: InputProps) {
  const { register } = useFormContext();
  return (
    <input
      type="datetime-local"
      className={INPUT_CLASS}
      disabled={disabled}
      step={60}
      {...register(name, buildValidationRules(field))}
    />
  );
}

export function SelectInput({ field, name, disabled }: InputProps) {
  const { register, formState: { errors } } = useFormContext();
  const hasError = !!errors[name];
  return (
    <select
      className={INPUT_CLASS}
      disabled={disabled}
      aria-required={field.required || undefined}
      aria-invalid={hasError || undefined}
      aria-describedby={hasError ? `${name}-error` : undefined}
      {...register(name, buildValidationRules(field))}
    >
      <option value="">请选择</option>
      {field.options?.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function RadioGroupInput({ field, name, disabled }: InputProps) {
  const { register } = useFormContext();
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2" role="radiogroup" aria-label={field.label}>
      {field.options?.map((opt) => (
        <label key={opt.value} className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="radio" value={opt.value} disabled={disabled} {...register(name, buildValidationRules(field))} />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

export function CheckboxInput({ field, name, disabled }: InputProps) {
  const { register } = useFormContext();
  if (field.options) {
    return (
      <div className="flex flex-wrap gap-x-5 gap-y-2" role="group" aria-label={field.label}>
        {field.options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-1.5 text-sm text-text-secondary">
            <input type="checkbox" value={opt.value} disabled={disabled} {...register(name)} />
            {opt.label}
          </label>
        ))}
      </div>
    );
  }
  return (
    <label className="flex items-center gap-1.5 text-sm text-text-secondary">
      <input type="checkbox" disabled={disabled} {...register(name)} />
      {field.label}
    </label>
  );
}

export function RatingInput({ field, name, disabled }: InputProps) {
  const { watch, setValue } = useFormContext();
  const value = Number(watch(name)) || 0;
  return (
    <div className="flex gap-1" role="radiogroup" aria-label={field.label}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => setValue(name, star, { shouldDirty: true })}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' && value < 5) setValue(name, value + 1, { shouldDirty: true });
            if (e.key === 'ArrowLeft' && value > 1) setValue(name, value - 1, { shouldDirty: true });
          }}
          className={star <= value ? 'text-xl text-amber-500' : 'text-xl text-surface-300'}
          aria-label={`评 ${star} 星`}
          aria-pressed={star <= value}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function TableFieldInput({ field, name, disabled }: InputProps) {
  const { control, watch } = useFormContext();
  const { append, remove } = useFieldArray({ control, name });
  const columns = field.tableColumns ?? [];
  // 用 watch 监听行数，绕开 useFieldArray fields 的初始化时序问题
  const rowValues = watch(name) as Array<Record<string, unknown>> | undefined;
  const rowCount = Array.isArray(rowValues) ? rowValues.length : 0;

  return (
    <div>
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.id} className="border-b border-surface-200 px-2 py-1 text-left font-medium text-text-secondary">
                  {col.label}
                </th>
              ))}
              {!disabled && <th className="border-b border-surface-200" />}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }, (_, idx) => (
              <tr key={idx}>
                {columns.map((col) => (
                  <td key={col.id} className="border-b border-surface-100 px-2 py-1">
                    <CellInput name={`${name}.${idx}.${col.id}`} col={col} disabled={disabled} control={control} />
                  </td>
                ))}
                {!disabled && (
                  <td className="border-b border-surface-100 px-2 py-1">
                    <button
                      type="button"
                      onClick={() => remove(idx)}
                      className="text-xs text-danger-600 hover:underline"
                      aria-label={`删除第 ${idx + 1} 行`}
                    >
                      删除
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="sm:hidden space-y-3">
        {Array.from({ length: rowCount }, (_, idx) => (
          <div key={idx} className="rounded-xl border border-surface-200 bg-surface-0 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-tertiary">第 {idx + 1} 行</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="text-xs text-danger-600 hover:underline"
                  aria-label={`删除第 ${idx + 1} 行`}
                >
                  删除
                </button>
              )}
            </div>
            {columns.map((col) => (
              <div key={col.id}>
                <label className="mb-0.5 block text-xs font-medium text-text-secondary">{col.label}</label>
                <CellInput name={`${name}.${idx}.${col.id}`} col={col} disabled={disabled} control={control} />
              </div>
            ))}
          </div>
        ))}
      </div>
      {!disabled && (
        <button
          type="button"
          onClick={() => append(Object.fromEntries(columns.map((c) => [c.id, ''])))}
          className="mt-2 text-sm text-brand-600 hover:underline"
        >
          + 添加一行
        </button>
      )}
    </div>
  );
}

/** 每个单元格用 useController 独立受控，确保用户输入实时写入表单值树。 */
function CellInput({
  name,
  col,
  disabled,
  control,
}: {
  name: string;
  col: { id: string; label: string; placeholder?: string; type?: string; options?: Array<{ value: string; label: string }> };
  disabled?: boolean;
  control: Control<Record<string, unknown>>;
}) {
  const { field } = useController({ name, control });
  if (col.type === 'select') {
    return (
      <select
        disabled={disabled}
        className={INPUT_CLASS}
        value={(field.value as string | undefined) ?? ''}
        onChange={(e) => field.onChange(e.target.value)}
        onBlur={field.onBlur}
        ref={field.ref}
        name={field.name}
      >
        <option value="">请选择</option>
        {col.options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      type="text"
      className={INPUT_CLASS}
      placeholder={col.placeholder}
      disabled={disabled}
      value={(field.value as string | undefined) ?? ''}
      onChange={(e) => field.onChange(e.target.value)}
      onBlur={field.onBlur}
      ref={field.ref}
      name={field.name}
    />
  );
}
