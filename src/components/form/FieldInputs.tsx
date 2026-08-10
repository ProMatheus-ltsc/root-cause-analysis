/**
 * 各 FieldType 对应的具体输入组件。均通过 useFormContext 拿到 register/control，
 * 用点路径 name（如 sectionId.0.fieldId）直接映射到表单值树。
 */
import { useFieldArray, useFormContext } from 'react-hook-form';
import type { FormField } from '../../types';

export const INPUT_CLASS =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500';

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
  const { register } = useFormContext();
  const listId = suggestions?.length ? `${name}-suggestions` : undefined;
  return (
    <>
      <input
        type="text"
        className={INPUT_CLASS}
        placeholder={field.placeholder}
        disabled={disabled}
        list={listId}
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
  const { register } = useFormContext();
  return (
    <textarea
      className={INPUT_CLASS}
      rows={4}
      placeholder={field.placeholder}
      disabled={disabled}
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

export function SelectInput({ field, name, disabled }: InputProps) {
  const { register } = useFormContext();
  return (
    <select className={INPUT_CLASS} disabled={disabled} {...register(name, buildValidationRules(field))}>
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
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {field.options?.map((opt) => (
        <label key={opt.value} className="flex items-center gap-1.5 text-sm text-slate-700">
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
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {field.options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-1.5 text-sm text-slate-700">
            <input type="checkbox" value={opt.value} disabled={disabled} {...register(name)} />
            {opt.label}
          </label>
        ))}
      </div>
    );
  }
  return (
    <label className="flex items-center gap-1.5 text-sm text-slate-700">
      <input type="checkbox" disabled={disabled} {...register(name)} />
      {field.label}
    </label>
  );
}

export function RatingInput({ name, disabled }: InputProps) {
  const { watch, setValue } = useFormContext();
  const value = Number(watch(name)) || 0;
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => setValue(name, star, { shouldDirty: true })}
          className={star <= value ? 'text-xl text-amber-500' : 'text-xl text-slate-300'}
          aria-label={`评 ${star} 星`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function TableFieldInput({ field, name, disabled }: InputProps) {
  const { register, control } = useFormContext();
  const { fields: rows, append, remove } = useFieldArray({ control, name });
  const columns = field.tableColumns ?? [];

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.id} className="border-b border-slate-200 px-2 py-1 text-left font-medium text-slate-600">
                {col.label}
              </th>
            ))}
            {!disabled && <th className="border-b border-slate-200" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.id}>
              {columns.map((col) => (
                <td key={col.id} className="border-b border-slate-100 px-2 py-1">
                  {col.type === 'select' ? (
                    <select className={INPUT_CLASS} disabled={disabled} {...register(`${name}.${idx}.${col.id}`)}>
                      <option value="">请选择</option>
                      {col.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" className={INPUT_CLASS} placeholder={col.placeholder} disabled={disabled} {...register(`${name}.${idx}.${col.id}`)} />
                  )}
                </td>
              ))}
              {!disabled && (
                <td className="border-b border-slate-100 px-2 py-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('确定删除这一行吗？')) remove(idx);
                    }}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    删除
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!disabled && (
        <button
          type="button"
          onClick={() => append(Object.fromEntries(columns.map((c) => [c.id, ''])))}
          className="mt-2 text-sm text-sky-600 hover:underline"
        >
          + 添加一行
        </button>
      )}
    </div>
  );
}
