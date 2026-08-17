/**
 * 各 FieldType 对应的具体输入组件（文本框、多行、数字、下拉、单选、表格等）。
 * 核心概念（初学者必读）：
 * - 所有组件都不自己维护 value / onChange，而是通过 useFormContext() 从上层拿到
 *   register / control，让 React Hook Form 统一管理表单值。
 * - name 采用"点路径"（如 'sectionId.0.fieldId'），可精确映射到表单值树的某一节点，
 *   因此同一个输入组件可以复用于任意层级、任意嵌套深度的字段。
 * - register(name, rules) 会返回 { ref, name, onChange, onBlur } 一组绑定属性，
 *   通过展开运算符 {...register(...)} 一次性绑到原生输入元素上。
 * - 校验失败信息统一从 formState.errors[name] 读取，并配合 aria-* 属性做无障碍提示。
 */
import { useFieldArray, useFormContext, useController, type Control } from 'react-hook-form';
import type { FormField, TableColumn } from '../../types';

/** 统一样式类名（Tailwind 拼出的字符串），保证所有输入控件外观一致；独立导出便于其他文件复用。 */
export const INPUT_CLASS =
  'w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-400 focus:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-surface-100 disabled:text-text-tertiary transition';

/** React Hook Form 校验规则对象：key 是校验器名（required/maxLength/min/...），value 是配置或错误文案。 */
type ValidationRules = Record<string, unknown>;

/**
 * 根据模板字段的元数据（必填、最大长度、正则、数值范围）动态生成 RHF 校验规则。
 * - required / maxLength / pattern / min / max 都是 react-hook-form 内置校验器；
 * - message 是校验失败时的中文提示，用字段的 label 拼出来更友好；
 * - 数字类型额外补充 min / max 数值范围校验。
 */
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

/** 所有输入组件的公共 props：field 是模板字段定义，name 是它在表单值树中的点路径。 */
interface InputProps {
  field: FormField;
  name: string;
  disabled?: boolean;
  suggestions?: string[];
}

/**
 * 单行文本输入框。
 * - 通过 register 绑定表单值，通过 formState.errors 读取该校验错误；
 * - 传入 suggestions 时渲染原生 <datalist>，实现"可选建议但不强制选择"的自动补全；
 * - aria-* 属性用于无障碍：出错时通过 aria-describedby 指向错误提示元素。
 */
export function TextInput({ field, name, disabled, suggestions }: InputProps) {
  const { register, formState: { errors } } = useFormContext();
  const listId = suggestions?.length ? `${name}-suggestions` : undefined; // datalist 与 input 通过 id 关联
  const errorId = `${name}-error`; // 错误提示元素的 id，供 aria-describedby 引用
  const hasError = !!errors[name]; // 该字段当前是否存在校验错误
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

/** 多行文本输入框，rows 固定 4 行；校验与错误展示逻辑同 TextInput。 */
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

/**
 * 数字输入框。注意注册时多传了 valueAsNumber: true：
 * 它让 RHF 在 onChange 时自动把字符串转成 number 再存入表单值，
 * 否则提交时取到的会是字符串（"3"），导致数值校验和后续计算出错。
 */
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

/** 日期选择输入框（<input type="date">，表单值形如 'YYYY-MM-DD'）。 */
export function DateInput({ field, name, disabled }: InputProps) {
  const { register } = useFormContext();
  return <input type="date" className={INPUT_CLASS} disabled={disabled} {...register(name, buildValidationRules(field))} />;
}

/** 日期时间选择输入框（<input type="datetime-local">）；step={60} 表示取值粒度精确到分钟。 */
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

/** 下拉选择框：默认渲染一个 value="" 的"请选择"占位选项，候选值来自 field.options。 */
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

/** 单选组：同一 name 的多个 radio 天然互斥，选中项的值就是表单值。 */
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

/**
 * 复选框。
 * - field.options 存在时渲染多选组：同一 name 的多个 checkbox 值会被 RHF
 *   自动收集成字符串数组存入表单值；
 * - 没有 options 时渲染单个开关复选框，选中状态为 true/false。
 */
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

/**
 * 星级评分（1~5 星），通过 watch(name) 读回当前值决定点亮几颗星。
 * 这里讲解"受控 + setValue + shouldDirty"：
 * - 没有用 register（因为按钮不是表单元素），而是手动 setValue(name, star) 把分值写回表单；
 * - { shouldDirty: true } 表示"本次修改计入 dirty 状态"，这样点击星星后
 *   依赖 dirty 判断的提交按钮才能正确亮起/可用；
 * - watch(name) 每次渲染都读最新值，保证星星高亮与表单值始终同步。
 */
export function RatingInput({ field, name, disabled }: InputProps) {
  const { watch, setValue } = useFormContext();
  const value = Number(watch(name)) || 0; // watch 读不到值时按 0 处理（未评分）
  return (
    <div className="flex gap-1" role="radiogroup" aria-label={field.label}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => setValue(name, star, { shouldDirty: true })}
          onKeyDown={(e) => {
            // 键盘无障碍：支持左右方向键逐星增减，并用 1~5 边界防止越界
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

/**
 * 表格型字段（适合"多行 × 多列"的结构化录入，如排查清单）。
 * 核心概念（useFieldArray + watch 的配合）：
 * - useFieldArray({ control, name }) 管理"数组形态"的表单值，append 加行、remove 删行；
 * - 渲染行数没有直接用 useFieldArray 返回的 fields，而是用 watch(name) 实时监听数组长度，
 *   这是为了避免"首次渲染时 fields 尚未初始化"导致的时序问题（行数忽多忽少）；
 * - 每个单元格交给 CellInput 用 useController 独立受控，保证输入实时写回表单值树；
 * - 移动端（sm:hidden）用卡片形式平铺展示，桌面端用 <table>，二者渲染同一份数据。
 */
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

/**
 * 表格单元格的输入组件（TableFieldInput 的内部子组件）。
 * 用 useController({ name, control }) 生成受控属性 { value, onChange, onBlur, ref, name }，
 * 再手动逐个绑到原生元素上。为什么要走 useController 而不是 register？
 * 因为表格单元格的 name 是运行时动态拼出的点路径（`name.行号.列id`），
 * 且父级用 useFieldArray 管理数组，只有 control 能建立正确的受控连接。
 * col.type 为 'select' 时渲染下拉，否则渲染文本框。
 */
function CellInput({
  name,
  col,
  disabled,
  control,
}: {
  name: string;
  col: TableColumn;
  disabled?: boolean;
  control: Control<Record<string, unknown>>;
}) {
  const { field } = useController({ name, control });
  // 兼容表格列 options 的两种写法：string[]（简写）或 {value,label}[]（带文案）
  const colOptions: Array<{ value: string; label: string }> = (col.options ?? []).map((o) =>
    typeof o === 'string' ? { value: o, label: o } : { value: o.value, label: o.label },
  );
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
        {colOptions.map((opt) => (
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
