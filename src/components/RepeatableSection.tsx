/**
 * 可重复段：管理条目数组（useFieldArray），支持添加/删除并自动编号。
 * 填写当前条目时，以精简摘要展示前面已填写的内容，避免用户忘记上文。
 * 删除条目时提供短暂的"撤销删除"恢复机会（5秒内可撤销）。
 * causalChain section 使用专用的卡片式逐对引导填写组件。
 * 头脑风暴/factors 段落用横向卡片条（BrainstormCardStrip）导航并展示全部已填内容，
 * 避免重复填写与上 / 下文丢失。
 */
import { useEffect, useRef, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import clsx from 'clsx';
import type { FormRecord, FormSection, Problem, TemplateId } from '../types';
import { CausalChainGuidedInput } from './form/CausalChainGuidedInput';
import { FieldList } from './form/FieldList';
import { KEY_FACTOR_MAX } from '../templates/shared';

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
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-xs font-medium text-slate-500">
        {(section.repeatLabel ?? '条目 {n}').replace('{n}', String(idx + 1))}
      </p>
      <p className="mt-0.5 text-sm text-slate-700 whitespace-pre-wrap break-words">{text.trim()}</p>
    </div>
  );
}

interface BrainstormPickerProps {
  brainstormCauses: string[];
  existingNames: string[];
  onPick: (causes: string[]) => void;
  /** 最大可选数（要因分析法矩阵上限），超过后需取消勾选多余项 */
  maxSelect?: number;
}

function BrainstormPicker({ brainstormCauses, existingNames, onPick, maxSelect }: BrainstormPickerProps) {
  const [showPicker, setShowPicker] = useState(false);

  const existingSet = new Set(existingNames.map((n) => n.toLowerCase().trim()));
  const selectableIndices = brainstormCauses
    .map((_, idx) => idx)
    .filter((idx) => !existingSet.has(brainstormCauses[idx].toLowerCase().trim()));

  // 打开选择器时默认全选候选原因（用户只需取消勾选多余项）
  const [selected, setSelected] = useState<Set<number>>(() => new Set(selectableIndices));

  if (!showPicker) {
    return (
      <button
        type="button"
        onClick={() => {
          setShowPicker(true);
          setSelected(new Set(selectableIndices));
        }}
        className="rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-700 hover:bg-sky-100 transition"
      >
        从候选原因中选择引入
      </button>
    );
  }

  const overLimit = maxSelect !== undefined && selected.size > maxSelect;

  function handleConfirm() {
    const picked = Array.from(selected)
      .filter((idx) => selectableIndices.includes(idx))
      .map((idx) => brainstormCauses[idx]);
    onPick(picked);
    setShowPicker(false);
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
        <p className="text-sm font-medium text-sky-800">
          {maxSelect !== undefined && selectableIndices.length > maxSelect
            ? `候选原因共 ${selectableIndices.length} 个，关系矩阵最多支持 ${maxSelect} 个，请取消勾选多余的原因`
            : '从头脑风暴候选原因中勾选引入（已有的不重复引入）'}
        </p>
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
          <span className="text-xs text-sky-600 leading-6">
            已选 {selected.size} / {selectableIndices.length} 项
            {overLimit && <span className="text-rose-600">（超限 {selected.size - (maxSelect ?? 0)}）</span>}
          </span>
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
                  else {
                    // 已达上限时禁止再勾选，需先取消其它项
                    if (maxSelect !== undefined && next.size >= maxSelect) return;
                    next.add(idx);
                  }
                  setSelected(next);
                }}
                className="mt-0.5"
              />
              <span className={`${alreadyExists ? 'line-through text-slate-400' : 'text-slate-700'} break-words leading-relaxed`}>
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
        disabled={selected.size === 0 || overLimit}
        className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-40"
      >
        {overLimit
          ? `请先取消勾选 ${selected.size - (maxSelect ?? 0)} 项（最多选 ${maxSelect} 个）`
          : `引入选中的 ${selected.size} 项`}
      </button>
    </div>
  );
}

interface BrainstormCardStripProps {
  section: FormSection;
  values: Record<string, unknown>;
  /** 哪个 entry 当前是焦点（高亮其卡片） */
  activeIndex: number | null;
  /** 点击某张卡片时回调（参数为 entry 索引），父组件负责滚动定位 */
  onCardClick: (idx: number) => void;
  /** 点击"添加新原因"卡片时回调，父组件负责 append */
  onAppendNew: () => void;
  disabled?: boolean;
}

/**
 * 横向卡片条：每个 entry 一张卡片，完整展示已填写的"原因"和"证据"。
 * 解决"已有原因截断看不清、容易重复填写"的问题：
 *   - 显示完整内容（不截断），并展示证据字段；
 *   - 点击卡片跳转到对应 entry 编辑器；
 *   - 当前激活 entry 对应的卡片高亮（其它自动收起，避免屏幕拥挤）。
 */
function BrainstormCardStrip({
  section,
  values,
  activeIndex,
  onCardClick,
  onAppendNew,
  disabled,
}: BrainstormCardStripProps) {
  const sectionEntries = (values[section.id] as Record<string, unknown>[] | undefined) ?? [];
  const primaryField = section.fields[0];
  const secondaryField = section.fields[1];

  function getEntryText(entry: Record<string, unknown>, fieldId: string | undefined): string {
    if (!fieldId) return '';
    const v = entry[fieldId];
    return typeof v === 'string' ? v.trim() : '';
  }

  const filledCount = sectionEntries.filter((e) => getEntryText(e, primaryField?.id).length > 0).length;
  const totalCount = sectionEntries.length;

  const stripRef = useRef<HTMLDivElement>(null);

  // 当 activeIndex 变化时，把对应卡片滚动到条带可视区域（横向）
  useEffect(() => {
    if (activeIndex === null || !stripRef.current) return;
    const activeCard = stripRef.current.querySelector<HTMLElement>(`[data-card-index="${activeIndex}"]`);
    if (activeCard) {
      activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeIndex]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <p className="text-xs font-semibold text-slate-600">
            已有原因{' '}
            <span className="text-brand-600">
              {filledCount} / {totalCount}
            </span>
          </p>
          {totalCount > filledCount && (
            <p className="text-xs text-slate-400">
              · 待补充 {totalCount - filledCount} 项
            </p>
          )}
        </div>
        <p className="text-xs text-slate-400">点击卡片跳转查看/编辑该原因</p>
      </div>
      <div
        ref={stripRef}
        className="flex items-start gap-2.5 overflow-x-auto pb-2 -mx-1 px-1 [scrollbar-width:thin]"
        role="list"
      >
        {sectionEntries.map((entry, idx) => {
          const cause = getEntryText(entry, primaryField?.id);
          const evidence = getEntryText(entry, secondaryField?.id);
          const isFilled = cause.length > 0;
          const isActive = idx === activeIndex;

          return (
            <button
              key={idx}
              type="button"
              role="listitem"
              data-card-index={idx}
              onClick={() => onCardClick(idx)}
              className={clsx(
                'group relative flex min-h-44 w-72 flex-shrink-0 snap-start flex-col gap-1.5 rounded-lg border-2 p-3 text-left transition',
                isActive
                  ? 'border-brand-500 bg-brand-50/70 shadow-md ring-2 ring-brand-200'
                  : isFilled
                    ? 'border-success/40 bg-success/5 hover:border-success/60 hover:shadow-sm'
                    : 'border-dashed border-slate-300 bg-slate-50/50 hover:border-brand-300 hover:bg-brand-50/40',
              )}
            >
              <div className="flex items-baseline justify-between">
                <span
                  className={clsx(
                    'text-xs font-semibold tracking-wide',
                    isActive ? 'text-brand-700' : isFilled ? 'text-emerald-700' : 'text-slate-400',
                  )}
                >
                  原因 {idx + 1}
                </span>
                <span
                  className={clsx(
                    'text-xs',
                    isFilled ? 'text-slate-400' : 'text-slate-400',
                  )}
                >
                  {isFilled ? `${cause.length} 字` : '空'}
                </span>
              </div>
              {isFilled ? (
                <>
                  <p className="text-sm leading-relaxed text-slate-800 break-words">
                    {cause}
                  </p>
                  {evidence && (
                    <div className="mt-auto border-t border-slate-200/70 pt-1.5">
                      <p className="text-xs leading-relaxed text-slate-500 break-words">
                        <span className="font-medium text-slate-400">证据：</span>
                        {evidence}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center text-center">
                  <p className="text-xs italic text-slate-400">
                    尚未填写
                    <br />
                    点击下方区域补充
                  </p>
                </div>
              )}
              {isActive && (
                <span className="absolute right-2 top-2 inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
              )}
            </button>
          );
        })}
        {!disabled && (
          <button
            type="button"
            onClick={onAppendNew}
            className="flex min-h-44 w-32 flex-shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/50 px-3 text-slate-500 transition hover:border-brand-400 hover:bg-brand-50/60 hover:text-brand-600"
          >
            <span className="text-2xl leading-none">+</span>
            <p className="text-xs">添加新原因</p>
          </button>
        )}
      </div>
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

  const isBrainstormLike = section.id === 'brainstorm' || section.id === 'factors';
  const isFactorsSection = section.id === 'factors';
  const autoImportedRef = useRef(false);

  /**
   * 每个 entry 编辑器容器的 DOM ref，用于：
   * - 卡片条点击 → 滚动到对应 entry；
   * - IntersectionObserver 自动追踪当前可视 entry → 反向高亮对应卡片。
   */
  const entryRefsMap = useRef<Map<number, HTMLElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  function setEntryRef(idx: number, el: HTMLElement | null) {
    if (el) {
      entryRefsMap.current.set(idx, el);
    } else {
      entryRefsMap.current.delete(idx);
    }
  }

  function handleCardClick(idx: number) {
    const el = entryRefsMap.current.get(idx);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // 把焦点放到该 entry 的第一个可输入字段
      const focusable = el.querySelector<HTMLElement>('input, textarea, select, [tabindex]');
      focusable?.focus({ preventScroll: true });
    }
    setActiveIndex(idx);
  }

  // 用 IntersectionObserver 监听各 entry 的可视状态，自动更新 activeIndex。
  useEffect(() => {
    if (!isBrainstormLike) return;

    const visibleSet = new Set<number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const obs of entries) {
          const idxAttr = obs.target.getAttribute('data-entry-index');
          if (idxAttr === null) continue;
          const idx = Number(idxAttr);
          if (obs.isIntersecting) visibleSet.add(idx);
          else visibleSet.delete(idx);
        }
        if (visibleSet.size > 0) {
          // 选最靠上的那个 entry 作为 active
          const sorted = Array.from(visibleSet).sort((a, b) => a - b);
          setActiveIndex(sorted[0]);
        }
      },
      {
        // 仅当 entry 进入视口上半部分时算"激活"
        rootMargin: '-15% 0px -55% 0px',
        threshold: 0,
      },
    );

    entryRefsMap.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [entries.length, isBrainstormLike]);

  function handleAppend() {
    const newEntry = Object.fromEntries(
      section.fields.map((f) => [
        f.id,
        f.autoTimestamp ? new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
      ]),
    );
    append(newEntry);
  }

  function handleDelete(idx: number) {
    const sectionEntries = (values[section.id] as Record<string, unknown>[] | undefined) ?? [];
    const deletedData = sectionEntries[idx] ? { ...sectionEntries[idx] } : null;
    remove(idx);
    // 删除后清理 ref，避免内存泄漏
    entryRefsMap.current.delete(idx);
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

  /**
   * 要因分析法自动引入：候选原因 ≤ 15 个（KEY_FACTOR_MAX）时，无需用户手动勾选，
   * 直接全量引入因素清单，方便直接进入关系矩阵；> 15 个时才交由用户筛选（见 BrainstormPicker）。
   */
  useEffect(() => {
    if (!isFactorsSection || autoImportedRef.current) return;
    if (brainstormCauses.length === 0) return;
    autoImportedRef.current = true; // 仅尝试一次，避免覆盖用户后续的手动修改

    const currentEntries = (values[section.id] as Record<string, unknown>[] | undefined) ?? [];
    const hasFilled = currentEntries.some((e) => typeof e?.name === 'string' && e.name.trim());
    if (hasFilled) return; // 用户已填写内容，不自动覆盖

    if (brainstormCauses.length > KEY_FACTOR_MAX) return; // 超过上限，交给用户筛选

    // 删除预填的空条目，再全量引入
    const blankIndices: number[] = [];
    for (let i = currentEntries.length - 1; i >= 0; i--) {
      const v = currentEntries[i]?.name;
      if (typeof v !== 'string' || !v.trim()) blankIndices.push(i);
    }
    for (const idx of blankIndices) remove(idx);
    for (const cause of brainstormCauses) {
      append({ name: cause, description: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFactorsSection, brainstormCauses]);

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
    <div ref={containerRef} className="space-y-4">
      {undoInfo && (
        <div className="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-2">
          <span className="text-sm text-amber-800">已删除一条记录</span>
          <button type="button" onClick={handleUndo} className="rounded bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700">
            撤销删除
          </button>
          <span className="text-xs text-amber-500">5秒后自动消失</span>
        </div>
      )}
      {!disabled && isFactorsSection && brainstormCauses.length > KEY_FACTOR_MAX && (
        <BrainstormPicker
          brainstormCauses={brainstormCauses}
          existingNames={existingNames}
          onPick={handleBrainstormPick}
          maxSelect={KEY_FACTOR_MAX}
        />
      )}
      {isBrainstormLike && entries.length > 0 && (
        <BrainstormCardStrip
          section={section}
          values={values}
          activeIndex={activeIndex}
          onCardClick={handleCardClick}
          onAppendNew={handleAppend}
          disabled={disabled}
        />
      )}
      {entries.map((entry, idx) => (
        <div
          key={entry.id}
          ref={(el) => setEntryRef(idx, el)}
          data-entry-index={idx}
          className={clsx(
            'rounded-lg border p-4 transition',
            isBrainstormLike && idx === activeIndex
              ? 'border-brand-300 shadow-md ring-1 ring-brand-100'
              : 'border-slate-200',
          )}
        >
          {section.id !== 'brainstorm' && section.id !== 'factors' && idx > 0 && (
            <div className="mb-3 space-y-1.5">
              <p className="text-xs font-medium text-slate-400">前序内容回顾</p>
              {Array.from({ length: idx }, (_, i) => (
                <EntrySummary key={i} section={section} idx={i} values={values} />
              ))}
            </div>
          )}
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
      ))}
      {!disabled && !shouldStopAppend && !isBrainstormLike && (
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
