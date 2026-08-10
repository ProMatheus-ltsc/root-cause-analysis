/**
 * 可重复段：管理条目数组（useFieldArray），支持添加/删除并自动编号。
 * 填写当前条目时，以精简摘要展示前面已填写的内容，避免用户忘记上文。
 */
import { useFieldArray, useFormContext } from 'react-hook-form';
import type { FormRecord, FormSection, TemplateId } from '../types';
import { FieldList } from './form/FieldList';

interface RepeatableSectionProps {
  section: FormSection;
  disabled: boolean;
  templateId: TemplateId;
  historyRecords: FormRecord[];
}

function EntrySummary({ section, idx, values }: { section: FormSection; idx: number; values: Record<string, unknown> }) {
  const entries = (values[section.id] as Record<string, unknown>[] | undefined) ?? [];
  const entry = entries[idx];
  if (!entry) return null;
  const primaryField = section.fields[0];
  const text = entry[primaryField.id];
  if (typeof text !== 'string' || !text.trim()) return null;
  const preview = text.trim().length > 80 ? text.trim().slice(0, 80) + '…' : text.trim();
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-xs font-medium text-slate-500">
        {(section.repeatLabel ?? '条目 {n}').replace('{n}', String(idx + 1))}
      </p>
      <p className="mt-0.5 text-sm text-slate-700">{preview}</p>
    </div>
  );
}

export function RepeatableSection({ section, disabled, templateId, historyRecords }: RepeatableSectionProps) {
  const { control, watch } = useFormContext();
  const { fields: entries, append, remove } = useFieldArray({ control, name: section.id });
  const values = watch();

  const shouldStopAppend = (() => {
    if (!section.stopAppendWhen) return false;
    const { fieldId, value } = section.stopAppendWhen;
    const sectionEntries = (values[section.id] as Record<string, unknown>[] | undefined) ?? [];
    return sectionEntries.some((entry) => entry[fieldId] === value);
  })();

  return (
    <div className="space-y-4">
      {entries.map((entry, idx) => (
        <div key={entry.id}>
          {idx > 0 && (
            <div className="mb-3 space-y-1.5">
              <p className="text-xs font-medium text-slate-400">前序内容回顾</p>
              {Array.from({ length: idx }, (_, i) => (
                <EntrySummary key={i} section={section} idx={i} values={values} />
              ))}
            </div>
          )}
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-700">
                {(section.repeatLabel ?? '条目 {n}').replace('{n}', String(idx + 1))}
              </h4>
              {!disabled && entries.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('确定删除这一条吗？')) remove(idx);
                  }}
                  className="text-xs text-rose-600 hover:underline"
                >
                  删除
                </button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldList
                fields={section.fields}
                basePath={`${section.id}.${idx}.`}
                disabled={disabled}
                templateId={templateId}
                historyRecords={historyRecords}
              />
            </div>
          </div>
        </div>
      ))}
      {!disabled && !shouldStopAppend && (
        <button
          type="button"
          onClick={() => append(Object.fromEntries(section.fields.map((f) => [f.id, ''])))}
          className="text-sm text-sky-600 hover:underline"
        >
          + 添加一条
        </button>
      )}
      {!disabled && shouldStopAppend && (
        <p className="text-xs text-slate-400">已确认根因，无需继续追问</p>
      )}
    </div>
  );
}
