/**
 * 可重复段：管理条目数组（useFieldArray），支持添加/删除并自动编号。
 * 填写当前条目时，以精简摘要展示前面已填写的内容，避免用户忘记上文。
 * 删除条目时提供短暂的"撤销删除"恢复机会（5秒内可撤销）。
 * causalChain section 使用专用的卡片式逐对引导填写组件。
 */
import { useRef, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import type { FormRecord, FormSection, Problem, TemplateId } from '../types';
import { CausalChainGuidedInput } from './form/CausalChainGuidedInput';
import { FieldList } from './form/FieldList';

interface RepeatableSectionProps {
  section: FormSection;
  disabled: boolean;
  templateId: TemplateId;
  historyRecords: FormRecord[];
  problem?: Problem;
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

interface BrainstormPickerProps {
  brainstormCauses: string[];
  existingNames: string[];
  onPick: (causes: string[]) => void;
}

function BrainstormPicker({ brainstormCauses, existingNames, onPick }: BrainstormPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  if (!showPicker) {
    return (
      <button
        type="button"
        onClick={() => setShowPicker(true)}
        className="rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-700 hover:bg-sky-100 transition"
      >
        从候选原因中选择引入
      </button>
    );
  }

  const existingSet = new Set(existingNames.map((n) => n.toLowerCase().trim()));
  const selectableIndices = brainstormCauses
    .map((_, idx) => idx)
    .filter((idx) => !existingSet.has(brainstormCauses[idx].toLowerCase().trim()));

  function handleConfirm() {
    const picked = Array.from(selected).map((idx) => brainstormCauses[idx]);
    onPick(picked);
    setShowPicker(false);
    setSelected(new Set());
  }

  function handleSelectAll() {
    setSelected(new Set(selectableIndices));
  }

  function handleInvertSelection() {
    const inverted = new Set<number>();
    for (const idx of selectableIndices) {
      if (!selected.has(idx)) inverted.add(idx);
    }
    setSelected(inverted);
  }

  function handleDeselectAll() {
    setSelected(new Set());
  }

  const allSelected = selectableIndices.length > 0 && selectableIndices.every((idx) => selected.has(idx));
  const noneSelected = selected.size === 0;

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-sky-800">从头脑风暴候选原因中勾选引入（已有的不重复引入）</p>
        <button type="button" onClick={() => setShowPicker(false)} className="text-xs text-slate-500 hover:underline">
          取消
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={allSelected ? handleDeselectAll : handleSelectAll}
          className="rounded border border-sky-300 px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100 transition"
        >
          {allSelected ? '取消全选' : '全选'}
        </button>
        <button
          type="button"
          onClick={handleInvertSelection}
          className="rounded border border-sky-300 px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100 transition"
        >
          反选
        </button>
        {!noneSelected && (
          <span className="text-xs text-sky-600 leading-6">已选 {selected.size} / {selectableIndices.length} 项</span>
        )}
      </div>
      <div className="max-h-60 overflow-y-auto space-y-1">
        {brainstormCauses.map((cause, idx) => {
          const alreadyExists = existingSet.has(cause.toLowerCase().trim());
          return (
            <label
              key={idx}
              className={`flex items-start gap-2 rounded-md px-2 py-1.5 text-sm ${alreadyExists ? 'opacity-40' : 'hover:bg-sky-100 cursor-pointer'}`}
            >
              <input
                type="checkbox"
                disabled={alreadyExists}
                checked={selected.has(idx)}
                onChange={() => {
                  const next = new Set(selected);
                  if (next.has(idx)) next.delete(idx);
                  else next.add(idx);
                  setSelected(next);
                }}
                className="mt-0.5"
              />
              <span className={alreadyExists ? 'line-through text-slate-400' : 'text-slate-700'}>
                {idx + 1}. {cause}
                {alreadyExists && ' (已引入)'}
              </span>
            </label>
          );
        })}
      </div>
      <button
        type="button"
        onClick={handleConfirm}
        disabled={selected.size === 0}
        className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-40"
      >
        引入选中的 {selected.size} 项
      </button>
    </div>
  );
}

function BrainstormSidebar({ section, values }: { section: FormSection; values: Record<string, unknown> }) {
  const [collapsed, setCollapsed] = useState(false);
  const sectionEntries = (values[section.id] as Record<string, unknown>[] | undefined) ?? [];
  const filledEntries = sectionEntries
    .map((entry, idx) => {
      const primaryField = section.fields[0];
      const text = entry[primaryField.id];
      if (typeof text !== 'string' || !text.trim()) return null;
      return { idx, text: text.trim() };
    })
    .filter((e): e is { idx: number; text: string } => e !== null);

  if (filledEntries.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-600">
          已有原因 ({filledEntries.length})
        </p>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          {collapsed ? '展开' : '收起'}
        </button>
      </div>
      {!collapsed && (
        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
          {filledEntries.map((e) => (
            <span
              key={e.idx}
              className="inline-flex items-baseline gap-1 rounded-md border border-slate-100 bg-slate-50 px-2 py-1 text-xs text-slate-600"
              title={e.text}
            >
              <span className="font-medium text-slate-400">{e.idx + 1}.</span>
              <span>{e.text.length > 20 ? e.text.slice(0, 20) + '…' : e.text}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function RepeatableSection({ section, disabled, templateId, historyRecords, problem }: RepeatableSectionProps) {
  if (section.id === 'causalChain') {
    return <CausalChainGuidedInput disabled={disabled} problem={problem} />;
  }

  return <DefaultRepeatableSection section={section} disabled={disabled} templateId={templateId} historyRecords={historyRecords} problem={problem} />;
}

function DefaultRepeatableSection({ section, disabled, templateId, historyRecords, problem }: RepeatableSectionProps) {
  const { control, watch } = useFormContext();
  const { fields: entries, append, remove, insert } = useFieldArray({ control, name: section.id });
  const values = watch();
  const [undoInfo, setUndoInfo] = useState<{ data: Record<string, unknown>; index: number } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleDelete(idx: number) {
    const sectionEntries = (values[section.id] as Record<string, unknown>[] | undefined) ?? [];
    const deletedData = sectionEntries[idx] ? { ...sectionEntries[idx] } : null;
    remove(idx);
    if (deletedData) {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      setUndoInfo({ data: deletedData, index: idx });
      undoTimerRef.current = setTimeout(() => setUndoInfo(null), 5000);
    }
  }

  function handleUndo() {
    if (!undoInfo) return;
    insert(undoInfo.index, undoInfo.data);
    setUndoInfo(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  }

  const shouldStopAppend = (() => {
    if (!section.stopAppendWhen) return false;
    const { fieldId, value } = section.stopAppendWhen;
    const sectionEntries = (values[section.id] as Record<string, unknown>[] | undefined) ?? [];
    return sectionEntries.some((entry) => entry[fieldId] === value);
  })();

  const brainstormCauses = (() => {
    if (section.id !== 'factors' && section.id !== 'causalChain') return [];
    if (!problem) return [];
    const brainstorm = problem.data?.['brainstorm'];
    if (!Array.isArray(brainstorm)) return [];
    return brainstorm
      .map((item) => (typeof item?.cause === 'string' ? item.cause.trim() : ''))
      .filter((c) => c.length > 0);
  })();

  const existingNames = (() => {
    const sectionEntries = (values[section.id] as Record<string, unknown>[] | undefined) ?? [];
    if (section.id === 'causalChain') {
      const names: string[] = [];
      for (const entry of sectionEntries) {
        if (typeof entry?.factorA === 'string' && entry.factorA.trim()) names.push(entry.factorA);
        if (typeof entry?.factorB === 'string' && entry.factorB.trim()) names.push(entry.factorB);
      }
      return names;
    }
    return sectionEntries
      .map((entry) => (typeof entry?.name === 'string' ? entry.name : ''))
      .filter((n) => n.trim().length > 0);
  })();

  function handleBrainstormPick(causes: string[]) {
    const sectionEntries = (values[section.id] as Record<string, unknown>[] | undefined) ?? [];
    const blankIndices: number[] = [];
    for (let i = sectionEntries.length - 1; i >= 0; i--) {
      const entry = sectionEntries[i];
      const primaryField = section.fields[0];
      const val = entry[primaryField.id];
      if (typeof val !== 'string' || !val.trim()) {
        blankIndices.push(i);
      }
    }
    for (const idx of blankIndices) {
      remove(idx);
    }

    if (section.id === 'causalChain') {
      for (const cause of causes) {
        const newEntry = Object.fromEntries(section.fields.map((f) => [f.id, '']));
        newEntry['factorA'] = cause;
        append(newEntry);
      }
    } else {
      for (const cause of causes) {
        const newEntry = Object.fromEntries(section.fields.map((f) => [f.id, '']));
        newEntry['name'] = cause;
        append(newEntry);
      }
    }
  }

  return (
    <div className="space-y-4">
      {undoInfo && (
        <div className="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-2">
          <span className="text-sm text-amber-800">已删除一条记录</span>
          <button type="button" onClick={handleUndo} className="rounded bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700">
            撤销删除
          </button>
          <span className="text-xs text-amber-500">5秒后自动消失</span>
        </div>
      )}
      {!disabled && brainstormCauses.length > 0 && (
        <BrainstormPicker
          brainstormCauses={brainstormCauses}
          existingNames={existingNames}
          onPick={handleBrainstormPick}
        />
      )}
      {(section.id === 'brainstorm' || section.id === 'factors') && entries.length > 0 && (
        <BrainstormSidebar section={section} values={values} />
      )}
      {entries.map((entry, idx) => (
        <div key={entry.id}>
          {section.id !== 'brainstorm' && section.id !== 'factors' && idx > 0 && (
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
                  onClick={() => handleDelete(idx)}
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
          onClick={() => {
            const newEntry = Object.fromEntries(
              section.fields.map((f) => [
                f.id,
                f.autoTimestamp ? new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
              ]),
            );
            append(newEntry);
          }}
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
