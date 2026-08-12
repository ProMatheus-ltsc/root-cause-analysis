/**
 * 字段渲染器：按 FieldType 分发到具体输入组件，统一处理标签/必填标记/提示语/
 * 错误信息/计算字段展示。用 React.memo 包裹避免无关字段重渲染。
 */
import { memo, useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import clsx from 'clsx';
import type { FormField, Problem } from '../types';
import {
  CheckboxInput,
  DateInput,
  DateTimeInput,
  NumberInput,
  RadioGroupInput,
  RatingInput,
  SelectInput,
  TableFieldInput,
  TextInput,
  TextareaInput,
} from './form/FieldInputs';
import { MatrixGuidedInput } from './form/MatrixGuidedInput';
import { SystemThinkAiPanel } from './form/SystemThinkAiPanel';
import { FishboneAutoCheckPanel } from './form/FishboneAutoCheckPanel';
import { KeyFactorAiPanel } from './form/KeyFactorAiPanel';

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
  problem?: Problem;
}

function FieldRendererImpl({ field, name, disabled, suggestions, problem }: FieldRendererProps) {
  const { watch, formState } = useFormContext();
  const values = watch();
  const error = getErrorAtPath(formState.errors as Record<string, unknown>, name);

  if (field.computed) {
    const result = field.computed.formula(values as Record<string, unknown>);
    // 可写的自动汇总字段：textarea/input 让用户可编辑，但初始值与前序字段联动
    if (field.computed.editable) {
      if (field.type === 'textarea') return <ComputedEditableTextarea field={field} name={name} disabled={disabled} />;
      return <ComputedEditableInput field={field} name={name} disabled={disabled} />;
    }
    // 结构化表格数据（带颜色高亮）：根据 type 分发到对应表格渲染器
    if (result && typeof result === 'object' && 'type' in result) {
      if ((result as { type: string }).type === 'causeScoreTable') {
        return <ComputedCauseScoreTable data={result as import('../templates/shared').CauseScoreTableData} />;
      }
      if ((result as { type: string }).type === 'keyFactorRankingTable') {
        return <ComputedRankingTable data={result as import('../templates/shared').KeyFactorRankingTableData} />;
      }
    }
    const display = (typeof result === 'string' ? result : '') || field.computed.placeholder;
    const stringResult = typeof result === 'string' ? result : '';
    return (
      <div className="space-y-1">
        <FieldLabel field={field} />
        <div className="flex items-start gap-2">
          <div className="flex-1 whitespace-pre-wrap rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">{display}</div>
          {stringResult && <CopyButton text={stringResult} />}
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
      <FieldInput field={field} name={name} disabled={disabled} suggestions={suggestions} problem={problem} />
      {error?.message && <p className="text-xs text-rose-600">{error.message}</p>}
    </div>
  );
}

function FieldLabel({ field }: { field: FormField }) {
  return (
    <label className={clsx('block text-sm font-medium text-slate-700', field.emphasis && 'text-base text-slate-900')}>
      {field.label}
      {field.required && <span className="ml-1 text-rose-500">*</span>}
      {field.priority === 'recommended' && <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">推荐完成</span>}
    </label>
  );
}

/**
 * 可写的自动汇总字段：
 * - 默认值由 formula 根据前序字段动态计算并写入
 * - 用户编辑后（formState.dirtyFields[name]=true）停止自动覆盖，保留用户值
 * - 字段保持 textarea 类型，用户可正常编辑
 */
function ComputedEditableTextarea({ field, name, disabled }: { field: FormField; name: string; disabled?: boolean }) {
  const { watch, setValue, formState } = useFormContext();
  const depValues = watch(field.computed?.dependsOn ?? []);
  const allValues = watch() as Record<string, unknown>;
  const userValue = (watch(name) as string | undefined) ?? '';
  useEffect(() => {
    if (formState.dirtyFields[name]) return; // 用户已编辑过，不覆盖
    const result = field.computed?.formula(allValues);
    const text = typeof result === 'string' ? result : '';
    if (text && text !== userValue) {
      setValue(name, text, { shouldDirty: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(depValues), formState.dirtyFields[name]]);

  return (
    <div className="space-y-1">
      <FieldLabel field={field} />
      {field.hint && <p className="text-xs text-slate-400">{field.hint}</p>}
      <textarea
        rows={4}
        className="w-full rounded-md border border-surface-200 bg-surface-50 px-3 py-2 text-sm focus:border-brand-400 focus:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:opacity-50"
        value={userValue}
        placeholder={field.placeholder}
        disabled={disabled}
        onChange={(e) => setValue(name, e.target.value, { shouldDirty: true })}
      />
    </div>
  );
}

function ComputedEditableInput({ field, name, disabled }: { field: FormField; name: string; disabled?: boolean }) {
  const { watch, setValue, formState } = useFormContext();
  const depValues = watch(field.computed?.dependsOn ?? []);
  const allValues = watch() as Record<string, unknown>;
  const userValue = (watch(name) as string | undefined) ?? '';
  useEffect(() => {
    if (formState.dirtyFields[name]) return;
    const result = field.computed?.formula(allValues);
    const text = typeof result === 'string' ? result : '';
    if (text && text !== userValue) {
      setValue(name, text, { shouldDirty: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(depValues), formState.dirtyFields[name]]);

  return (
    <div className="space-y-1">
      <FieldLabel field={field} />
      {field.hint && <p className="text-xs text-slate-400">{field.hint}</p>}
      <input
        type="text"
        className="w-full rounded-md border border-surface-200 bg-surface-50 px-3 py-2 text-sm focus:border-brand-400 focus:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:opacity-50"
        value={userValue}
        placeholder={field.placeholder}
        disabled={disabled}
        onChange={(e) => setValue(name, e.target.value, { shouldDirty: true })}
      />
    </div>
  );
}

/** 单元格配色：根因红色系、过因中性、表因橙色系（按角色） */
const ROLE_ROW_BG: Record<string, string> = {
  root: 'bg-rose-50',
  transit: 'bg-white',
  surface: 'bg-amber-50',
};
const ROLE_BADGE: Record<string, string> = {
  root: 'bg-rose-100 text-rose-700 border-rose-300',
  transit: 'bg-slate-100 text-slate-600 border-slate-300',
  surface: 'bg-amber-100 text-amber-700 border-amber-300',
};

/** 因/果得分分类的彩色表格：行按根因/过因/表因配色，判定列徽章高亮 */
function ComputedCauseScoreTable({ data }: { data: import('../templates/shared').CauseScoreTableData }) {
  if (!data.rows.length) return null;
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-md border border-surface-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs font-medium text-slate-500">
              <th className="border-b border-surface-200 px-3 py-2 text-left">#</th>
              <th className="border-b border-surface-200 px-3 py-2 text-left">因素</th>
              <th className="border-b border-surface-200 px-3 py-2 text-center">影响其他因素（次数）</th>
              <th className="border-b border-surface-200 px-3 py-2 text-center">被其他因素影响（次数）</th>
              <th className="border-b border-surface-200 px-3 py-2 text-center">定位得分</th>
              <th className="border-b border-surface-200 px-3 py-2 text-center">判定</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.rank} className={clsx('border-b border-surface-100', ROLE_ROW_BG[r.role])}>
                <td className="px-3 py-2 text-slate-400 tabular-nums">{r.rank}</td>
                <td className="px-3 py-2 font-medium text-slate-800">{r.name}</td>
                <td className="px-3 py-2 text-center text-slate-600 tabular-nums">{r.outCount}</td>
                <td className="px-3 py-2 text-center text-slate-600 tabular-nums">{r.inCount}</td>
                <td className={clsx('px-3 py-2 text-center font-bold tabular-nums', r.role === 'root' && 'text-rose-600', r.role === 'surface' && 'text-amber-700')}>
                  {r.score > 0 ? '+' : ''}
                  {r.score}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={clsx('inline-block rounded-full border px-2 py-0.5 text-xs font-semibold', ROLE_BADGE[r.role])}>
                    {r.roleLabel}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.summary.length > 0 && (
        <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 space-y-0.5">
          {data.summary.map((s, i) => (
            <p key={i}>· {s}</p>
          ))}
        </div>
      )}
    </div>
  );
}

/** DEMATEL 帕累托排名表格：关键因素整行琥珀色高亮，非关键蓝色系 */
function ComputedRankingTable({ data }: { data: import('../templates/shared').KeyFactorRankingTableData }) {
  if (!data.rows.length) return null;
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-md border border-surface-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs font-medium text-slate-500">
              <th className="border-b border-surface-200 px-3 py-2 text-left">名次</th>
              <th className="border-b border-surface-200 px-3 py-2 text-left">因素</th>
              <th className="border-b border-surface-200 px-3 py-2 text-center">影响度（汇总）</th>
              <th className="border-b border-surface-200 px-3 py-2 text-center">累计贡献</th>
              <th className="border-b border-surface-200 px-3 py-2 text-center">关键</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.rank} className={clsx('border-b border-surface-100', r.isKey ? 'bg-amber-50' : 'bg-white')}>
                <td className="px-3 py-2 text-slate-400 tabular-nums">{r.rank}</td>
                <td className="px-3 py-2 font-medium text-slate-800">{r.name}</td>
                <td className="px-3 py-2 text-center text-slate-700 tabular-nums">{r.centrality}</td>
                <td className={clsx('px-3 py-2 text-center tabular-nums font-semibold', r.isKey ? 'text-amber-700' : 'text-slate-500')}>
                  {(r.cumulativePercent * 100).toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-center">
                  {r.isKey ? (
                    <span className="inline-block rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      ★ 关键
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.keyNames.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-900 space-y-1">
          <p>
            <strong>★ 优先关注的关键原因</strong>（累计影响占比达 {(data.threshold * 100).toFixed(0)}%，即"关键的少数"）：
          </p>
          <div className="flex flex-wrap gap-1.5">
            {data.keyNames.map((n, i) => (
              <span key={i} className="inline-block rounded-full border border-amber-300 bg-white px-2 py-0.5 text-amber-700">
                {n}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FieldInput({ field, name, disabled, suggestions, problem }: FieldRendererProps) {
  switch (field.type) {
    case 'textarea':
      return <TextareaInput field={field} name={name} disabled={disabled} />;
    case 'number':
      return <NumberInput field={field} name={name} disabled={disabled} />;
    case 'date':
      return <DateInput field={field} name={name} disabled={disabled} />;
    case 'datetime':
      return <DateTimeInput field={field} name={name} disabled={disabled} />;
    case 'select':
      return <SelectInput field={field} name={name} disabled={disabled} />;
    case 'radio':
      return <RadioGroupInput field={field} name={name} disabled={disabled} />;
    case 'checkbox':
      return <CheckboxInput field={field} name={name} disabled={disabled} />;
    case 'rating':
      return <RatingInput field={field} name={name} disabled={disabled} />;
    case 'table':
      if (field.id === 'matrix') {
        return <MatrixGuidedInput field={field} name={name} disabled={disabled} />;
      }
      return <TableFieldInput field={field} name={name} disabled={disabled} />;
    case 'custom':
      if (field.id === 'aiLoopAnalysis') {
        return <SystemThinkAiPanel problem={problem} disabled={disabled} />;
      }
      if (field.id === 'keyFactorAiAnalysis') {
        return <KeyFactorAiPanel problem={problem} disabled={disabled} />;
      }
      if (field.id.endsWith('AutoCheck')) {
        // fishbone 模板各维度的自动勾选助手：field.id 如 manAutoCheck / machineAutoCheck
        // sectionId 取 field.id 去掉 'AutoCheck' 后缀
        const sectionId = field.id.replace(/AutoCheck$/, '');
        return <FishboneAutoCheckPanel problem={problem} sectionId={sectionId} disabled={disabled} />;
      }
      return <p className="text-sm text-slate-400">未知的自定义字段：{field.id}</p>;
    case 'text':
    default:
      return <TextInput field={field} name={name} disabled={disabled} suggestions={suggestions} />;
  }
}

export const FieldRenderer = memo(FieldRendererImpl);
