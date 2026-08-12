/**
 * 可重复段：管理条目数组（useFieldArray），支持添加/删除并自动编号。
 * 填写当前条目时，以精简摘要展示前面已填写的内容，避免用户忘记上文。
 * 删除条目时提供短暂的"撤销删除"恢复机会（5秒内可撤销）。
 * causalChain section 使用专用的卡片式逐对引导填写组件。
 * brainstorm 段有 sticky 置顶的横向卡片条（BrainstormCardStrip）导航并展示全部已填内容；
 * 每条 entry 支持折叠/展开，entry 底部提供"上一条 / 下一条"专注导航；
 * 页面右侧悬浮按钮（FloatExpandToggleButton）可全局折叠/展开全部 entry。
 * factors 段（要因分析法）候选原因 ≤ 15 时自动全量引入，> 15 时由 BrainstormPicker 筛选。
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import clsx from 'clsx';
import type { FormField, FormRecord, FormSection, Problem, TemplateId } from '../types';
import { CausalChainGuidedInput } from './form/CausalChainGuidedInput';
import { FieldList } from './form/FieldList';
import { KEY_FACTOR_MAX } from '../templates/shared';

interface RepeatableSectionProps {
  section: FormSection;
  disabled: boolean;
  templateId: TemplateId;
  historyRecords: FormRecord[];
  problem?: Problem;
  /** factors 段候选 ≤ 15 自动引入填满后回调（用于自动进入关系矩阵阶段，仅触发一次） */
  onAutoFilled?: () => void;
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

/** 在折叠态展示 entry 内容的紧凑预览：取第一个非空字符串字段，不截断。 */
function EntryPreviewText({ entry, fields }: { entry: Record<string, unknown>; fields: FormField[] }) {
  for (const f of fields) {
    const v = entry[f.id];
    if (typeof v === 'string' && v.trim()) {
      const text = v.trim();
      const preview = text.length > 120 ? text.slice(0, 120) + '…' : text;
      return <span className="text-xs font-normal text-slate-500 break-words">· {preview}</span>;
    }
  }
  return <span className="text-xs font-normal italic text-slate-400">（尚未填写，点击展开）</span>;
}

/** 折叠/展开图标（SVG，无外部依赖）。 */
function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={clsx('h-4 w-4 shrink-0 text-slate-400 transition-transform', expanded && 'rotate-90 text-brand-500')}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

/** 相似原因检测：相似度阈值，0.5 以上视为"可能重复/相似"。 */
export const SIMILARITY_THRESHOLD = 0.5;

/**
 * 文本相似度（0-1）：去空白 + 小写后，基于字符 2-gram 的 Sørensen–Dice 系数。
 * Dice 对长度不对称的句子比 Jaccard 更宽容，适合中文短语/长句的"改写近义"检测。
 */
export function textSimilarity(a: string, b: string): number {
  const norm = (s: string) => (s ?? '').toLowerCase().replace(/\s+/g, '');
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const bigrams = (s: string): Set<string> => {
    const set = new Set<string>();
    const padded = `#${s}#`;
    for (let i = 0; i < padded.length - 1; i++) set.add(padded.slice(i, i + 2));
    return set;
  };

  const sa = bigrams(na);
  const sb = bigrams(nb);
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter++;
  if (inter === 0) return 0;
  return (2 * inter) / (sa.size + sb.size);
}

export interface SimilarPair {
  /** 相似条目的索引 */
  idx: number;
  /** 相似度 0-1 */
  score: number;
  /** 相似条目的首字段文本（用于展示） */
  text: string;
}

/** 两两比较 section 内各 entry 的首字段，返回每个 entry → 与其相似的其他 entry 列表（按分数降序）。 */
export function computeSimilarPairs(
  entries: Record<string, unknown>[],
  primaryFieldId: string,
  threshold: number = SIMILARITY_THRESHOLD,
): Map<number, SimilarPair[]> {
  const filled: { idx: number; text: string }[] = [];
  entries.forEach((entry, idx) => {
    const v = entry?.[primaryFieldId];
    if (typeof v === 'string' && v.trim()) filled.push({ idx, text: v.trim() });
  });

  const result = new Map<number, SimilarPair[]>();
  for (let i = 0; i < filled.length; i++) {
    for (let j = i + 1; j < filled.length; j++) {
      const score = textSimilarity(filled[i].text, filled[j].text);
      if (score >= threshold) {
        const a = filled[i];
        const b = filled[j];
        result.set(a.idx, [...(result.get(a.idx) ?? []), { idx: b.idx, score, text: b.text }]);
        result.set(b.idx, [...(result.get(b.idx) ?? []), { idx: a.idx, score, text: a.text }]);
      }
    }
  }
  for (const list of result.values()) {
    list.sort((x, y) => y.score - x.score);
  }
  return result;
}

/**
 * 全局"全部折叠 / 全部展开"控制：
 * - DefaultRepeatableSection 挂载时 registerSection 上报自己的 expand/collapse 函数
 * - 悬浮按钮 forceExpandAll / forceCollapseAll 触发所有已注册 section 同步
 * - mode 显示当前最新一次操作的语义
 */
interface RepeatableExpandContextValue {
  registerSection: (id: string, controls: { expand: () => void; collapse: () => void }) => () => void;
  forceExpandAll: () => void;
  forceCollapseAll: () => void;
  mode: 'expanded' | 'collapsed';
}

const RepeatableExpandContext = createContext<RepeatableExpandContextValue | null>(null);

/** 无 Provider 时的容错 fallback：所有操作 no-op，页面不崩。 */
const NOOP_EXPAND_CTX: RepeatableExpandContextValue = {
  registerSection: () => () => {},
  forceExpandAll: () => {},
  forceCollapseAll: () => {},
  mode: 'collapsed',
};

export function useRepeatableExpand(): RepeatableExpandContextValue {
  return useContext(RepeatableExpandContext) ?? NOOP_EXPAND_CTX;
}

export function RepeatableExpandProvider({ children }: { children: ReactNode }) {
  const sectionsRef = useRef<Map<string, { expand: () => void; collapse: () => void }>>(new Map());
  const [mode, setMode] = useState<'expanded' | 'collapsed'>('collapsed');

  const registerSection = useCallback(
    (id: string, controls: { expand: () => void; collapse: () => void }) => {
      sectionsRef.current.set(id, controls);
      return () => {
        sectionsRef.current.delete(id);
      };
    },
    [],
  );

  const forceExpandAll = useCallback(() => {
    sectionsRef.current.forEach((c) => c.expand());
    setMode('expanded');
  }, []);

  const forceCollapseAll = useCallback(() => {
    sectionsRef.current.forEach((c) => c.collapse());
    setMode('collapsed');
  }, []);

  const value = useMemo(
    () => ({ registerSection, forceExpandAll, forceCollapseAll, mode }),
    [registerSection, forceExpandAll, forceCollapseAll, mode],
  );

  return <RepeatableExpandContext.Provider value={value}>{children}</RepeatableExpandContext.Provider>;
}

/**
 * 页面右侧全局可拖动悬浮按钮：点击切换"全部折叠 / 全部展开"。
 * - 默认位置：右侧 16px、垂直居中
 * - 鼠标按下并拖动（位移 > 3px）即移动按钮；纯点击则触发折叠/展开
 * - 拖动范围限制在视口内
 */
export function FloatExpandToggleButton() {
  const ctx = useContext(RepeatableExpandContext);
  const { mode, forceExpandAll, forceCollapseAll } = useRepeatableExpand();
  const [pos, setPos] = useState<{ right: number; topPercent: number }>({ right: 16, topPercent: 50 });
  const dragRef = useRef<{ startX: number; startY: number; moved: boolean } | null>(null);

  // 未包裹 RepeatableExpandProvider 时不渲染（如某些页面没有 repeatable section 时）
  if (!ctx) return null;

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (!d.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) d.moved = true;
      if (d.moved) {
        setPos((p) => ({
          right: Math.max(0, Math.min(window.innerWidth - 56, p.right - dx)),
          topPercent: Math.max(0, Math.min(100, p.topPercent - (dy / window.innerHeight) * 100)),
        }));
        d.startX = e.clientX;
        d.startY = e.clientY;
      }
    }
    function onUp() {
      // 不清空 dragRef；交给 onMouseUp 内的 dragRef.current === null 检查避免 click 误触
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  function handleMouseDown(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, moved: false };
  }

  function handleMouseUp() {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || d.moved) return; // 拖动时不触发点击
    // 纯点击：切换模式
    if (mode === 'expanded') forceCollapseAll();
    else forceExpandAll();
  }

  return (
    <button
      type="button"
      aria-label={mode === 'expanded' ? '全部折叠' : '全部展开'}
      title={mode === 'expanded' ? '全部折叠（点击） / 拖动调整位置' : '全部展开（点击） / 拖动调整位置'}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={(e) => {
        // 触屏：把首个 touch 当作起点
        const t = e.touches[0];
        if (!t) return;
        dragRef.current = { startX: t.clientX, startY: t.clientY, moved: false };
      }}
      onTouchMove={(e) => {
        const d = dragRef.current;
        if (!d) return;
        const t = e.touches[0];
        if (!t) return;
        const dx = t.clientX - d.startX;
        const dy = t.clientY - d.startY;
        if (!d.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) d.moved = true;
        if (d.moved) {
          setPos((p) => ({
            right: Math.max(0, Math.min(window.innerWidth - 56, p.right - dx)),
            topPercent: Math.max(0, Math.min(100, p.topPercent - (dy / window.innerHeight) * 100)),
          }));
          d.startX = t.clientX;
          d.startY = t.clientY;
        }
      }}
      onTouchEnd={() => {
        const d = dragRef.current;
        dragRef.current = null;
        if (!d || d.moved) return;
        if (mode === 'expanded') forceCollapseAll();
        else forceExpandAll();
      }}
      style={{
        right: `${pos.right}px`,
        top: `${pos.topPercent}%`,
        transform: 'translateY(-50%)',
      }}
      className="fixed z-40 flex h-12 w-12 items-center justify-center rounded-full border border-brand-300 bg-white/90 shadow-lg backdrop-blur transition hover:bg-brand-50 active:cursor-grabbing cursor-grab select-none"
    >
      {/* 双箭头：上半箭头 + 下半箭头，按 mode 切换方向 */}
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-brand-600" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {mode === 'expanded' ? (
          <>
            <polyline points="6 9 12 15 18 9" />
            <polyline points="6 14 12 20 18 14" />
          </>
        ) : (
          <>
            <polyline points="6 15 12 9 18 15" />
            <polyline points="6 10 12 4 18 10" />
          </>
        )}
      </svg>
    </button>
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

interface WhyFirstLevelPickerProps {
  causes: string[];
  currentValue: string;
  onSelect: (cause: string) => void;
  disabled?: boolean;
}

/**
 * 5 Why 第 1 层专属：从头脑风暴候选原因中单选一个作为首层答案。
 * 全部候选完整展示（不截断），点击即写入 why 字段；当前值高亮。
 */
function WhyFirstLevelPicker({ causes, currentValue, onSelect, disabled }: WhyFirstLevelPickerProps) {
  const [expanded, setExpanded] = useState(true);
  const current = currentValue.trim();

  if (causes.length === 0) return null;

  return (
    <div className="mb-3 rounded-lg border border-brand-200 bg-brand-50/50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-brand-800">
          第 1 层：从头脑风暴候选原因中选取最符合的一个
        </p>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 text-xs text-slate-500 hover:underline"
        >
          {expanded ? '收起' : '展开'}
        </button>
      </div>
      {expanded && (
        <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
          {causes.map((cause, idx) => {
            const isSelected = cause.toLowerCase() === current.toLowerCase();
            return (
              <button
                key={idx}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(cause)}
                className={clsx(
                  'block w-full rounded-md border px-2.5 py-1.5 text-left text-sm leading-relaxed break-words transition',
                  isSelected
                    ? 'border-brand-500 bg-brand-100 text-brand-800 font-medium'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50',
                )}
              >
                {idx + 1}. {cause}
              </button>
            );
          })}
        </div>
      )}
      {current && (
        <p className="mt-2 text-xs text-emerald-700 break-words">
          ✓ 当前第 1 层：{current}
        </p>
      )}
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
  /** 相似原因检测结果：entry 索引 → 与其相似的其它 entry 列表 */
  similarPairs?: Map<number, SimilarPair[]>;
  disabled?: boolean;
}

/**
 * 横向卡片条（sticky 置顶）：每个 entry 一张卡片，完整展示已填写的"原因"和"证据"。
 * 解决"已有原因截断看不清、容易重复填写"的问题：
 *   - 显示完整内容（不截断），并展示证据字段；
 *   - 点击卡片跳转到对应 entry 编辑器；
 *   - 当前激活 entry 对应的卡片高亮（其它自动收起，避免屏幕拥挤）。
 *   - 与其它原因高度相似时，卡片右上角显示 "≈ 与 #N 相似" 徽标。
 * 滚动时 sticky 吸顶常驻，随时可点跳转；全局折叠/展开由右侧悬浮按钮控制。
 */
function BrainstormCardStrip({
  section,
  values,
  activeIndex,
  onCardClick,
  onAppendNew,
  similarPairs,
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
    <div className="sticky top-2 z-20 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
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
              {isFilled && similarPairs?.get(idx) && similarPairs.get(idx)!.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(similarPairs.get(idx) as SimilarPair[]).map((p) => (
                    <span
                      key={p.idx}
                      className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                      title={p.text}
                    >
                      ≈ 与 #{p.idx + 1} 相似 {(p.score * 100).toFixed(0)}%
                    </span>
                  ))}
                </div>
              )}
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

export function RepeatableSection({ section, disabled, templateId, historyRecords, problem, onAutoFilled }: RepeatableSectionProps) {
  if (section.id === 'causalChain') {
    return <CausalChainGuidedInput disabled={disabled} problem={problem} />;
  }

  return (
    <DefaultRepeatableSection
      section={section}
      disabled={disabled}
      templateId={templateId}
      historyRecords={historyRecords}
      problem={problem}
      onAutoFilled={onAutoFilled}
    />
  );
}

function DefaultRepeatableSection({ section, disabled, templateId, historyRecords, problem, onAutoFilled }: RepeatableSectionProps) {
  const { control, watch, setValue } = useFormContext();
  const { fields: entries, append, remove, insert } = useFieldArray({ control, name: section.id });
  const values = watch();
  const [undoInfo, setUndoInfo] = useState<{ data: Record<string, unknown>; index: number } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isBrainstormLike = section.id === 'brainstorm' || section.id === 'factors';
  const isFactorsSection = section.id === 'factors';
  const isWhyChain = section.id === 'whyChain';

  /** factors 自动引入完成回调：用 ref 持有最新函数，并确保只触发一次 */
  const onAutoFilledRef = useRef(onAutoFilled);
  onAutoFilledRef.current = onAutoFilled;
  const autoFilledRef = useRef(false);

  /**
   * 每条 entry 的折叠/展开状态：使用 React state 持久化。
   * 默认全部折叠，仅第一条（idx===0）默认展开。
   */
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set([0]));

  /**
   * 全局"全部折叠 / 全部展开"按钮的注册：用 ref 持有最新回调，
   * 仅注册一次，避免 setExpanded/entries 等频繁变化导致重复 register。
   * 右侧悬浮按钮 forceExpandAll / forceCollapseAll 会调用注册的 expand/collapse 函数。
   */
  const expandAllRef = useRef<() => void>(() => {});
  const collapseAllRef = useRef<() => void>(() => {});
  // 每次 render 更新最新实现闭包（基于当前 entries 长度）
  expandAllRef.current = () => setExpanded(new Set(entries.map((_, i) => i)));
  collapseAllRef.current = () => setExpanded(new Set([0]));
  const { registerSection } = useRepeatableExpand();
  useEffect(() => {
    return registerSection(section.id, {
      expand: () => expandAllRef.current?.(),
      collapse: () => collapseAllRef.current?.(),
    });
  }, [registerSection, section.id]);

  /**
   * 每个 entry 编辑器容器的 DOM ref，用于：
   * - 卡片条点击 → 滚动到对应 entry；
   * - IntersectionObserver 自动追踪当前可视 entry → 反向高亮对应卡片。
   */
  const entryRefsMap = useRef<Map<number, HTMLElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const previousLenRef = useRef(entries.length);

  useEffect(() => {
    if (entries.length > previousLenRef.current) {
      // 用户新增了条目：自动展开新条目，并滚动到它（等 DOM 更新）
      const newIdx = entries.length - 1;
      setExpanded((prev) => {
        const next = new Set(prev);
        next.add(newIdx);
        return next;
      });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          entryRefsMap.current.get(newIdx)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      });
    }
    previousLenRef.current = entries.length;
  }, [entries.length]);

  function toggleExpanded(idx: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  /**
   * "专注模式"导航：跳转到目标 entry 时，只展开这一条、折叠其余。
   * 用于卡片条点击 / 上一条 / 下一条 / 相似提示跳转 —— 让用户始终专注当前一条，
   * 避免折叠列表很长、减少上滑时间。
   */
  function navigateToEntry(idx: number) {
    setExpanded(new Set([idx]));
    setActiveIndex(idx);

    // 等 React commit + DOM 更新，再滚动 + focus
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = entryRefsMap.current.get(idx);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const focusable = el.querySelector<HTMLElement>('input, textarea, select, [tabindex]');
        focusable?.focus({ preventScroll: true });
      });
    });
  }

  function setEntryRef(idx: number, el: HTMLElement | null) {
    if (el) {
      entryRefsMap.current.set(idx, el);
    } else {
      entryRefsMap.current.delete(idx);
    }
  }

  // 注：跳转逻辑统一走 navigateToEntry（见上），handleCardClick 已废弃。

  // -- 派生数据 --

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

  const brainstormCauses = useMemo(() => {
    if (section.id !== 'factors' && section.id !== 'causalChain' && section.id !== 'whyChain') return [];
    if (!problem) return [];
    const brainstorm = problem.data?.['brainstorm'];
    if (!Array.isArray(brainstorm)) return [];
    return brainstorm
      .map((item) => (typeof item?.cause === 'string' ? item.cause.trim() : ''))
      .filter((c) => c.length > 0);
  }, [problem, section.id]);

  /**
   * 要因分析法（factors 段）自动引入：
   * - 候选原因 ≤ 15 个（KEY_FACTOR_MAX）时，自动全量引入因素清单，用户无需手动勾选，
   *   直接进入关系矩阵阶段；
   * - > 15 个时由 BrainstormPicker 让用户取消勾选多余项。
   * 采用"补齐缺失"策略：已引入的候选保留，只补充缺失的候选，并清理空占位条目
   * （避免旧版 hasFilled 保护导致的"只识别了一个原因"问题）。
   */
  useEffect(() => {
    if (!isFactorsSection) return;
    if (brainstormCauses.length === 0) return;
    if (brainstormCauses.length > KEY_FACTOR_MAX) return; // > 15 交给 BrainstormPicker

    const currentEntries = (values[section.id] as Record<string, unknown>[] | undefined) ?? [];

    // 已引入的非空 name 集合
    const existingNames = new Set(
      currentEntries
        .map((e) => (typeof e?.name === 'string' ? e.name.trim() : ''))
        .filter((n) => n.length > 0),
    );

    // 缺失的候选（尚未引入）
    const missing = brainstormCauses.filter((c) => !existingNames.has(c));

    // 清理空占位条目（如 buildDefaultValues 预填的 minEntries 空 entry）
    const blankIndices: number[] = [];
    for (let i = currentEntries.length - 1; i >= 0; i--) {
      const v = currentEntries[i]?.name;
      if (typeof v !== 'string' || !v.trim()) blankIndices.push(i);
    }
    for (const idx of blankIndices) remove(idx);

    // 补齐缺失候选
    if (missing.length > 0) {
      for (const cause of missing) {
        append({ name: cause, description: '' });
      }
      // 自动引入完成（本次补齐了内容）→ 通知父组件直接进入关系矩阵阶段，仅一次
      if (!autoFilledRef.current) {
        autoFilledRef.current = true;
        onAutoFilledRef.current?.();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFactorsSection, brainstormCauses]);

  /**
   * 相似原因检测：仅对"原因型"段落（brainstorm / factors）两两比较首字段。
   * 用户输入时实时更新（依赖 values），用于：
   *   - 卡片条上标注 "≈ 与 #N 相似"；
   *   - entry 编辑区内琥珀色提示条，快速发现可能重复/相似的原因。
   */
  const similarPairs = useMemo(() => {
    if (section.id !== 'brainstorm' && section.id !== 'factors') return new Map<number, SimilarPair[]>();
    const sectionEntries = (values[section.id] as Record<string, unknown>[] | undefined) ?? [];
    const primaryFieldId = section.fields[0]?.id;
    if (!primaryFieldId) return new Map<number, SimilarPair[]>();
    return computeSimilarPairs(sectionEntries, primaryFieldId);
  }, [values, section.id, section.fields]);

  /**
   * factors 段已引入的候选名称集合：供 BrainstormPicker 标记"已引入"项
   * （> 15 个候选时用户取消勾选多余项）。
   */
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
      {section.id === 'brainstorm' && entries.length > 0 && (
        <BrainstormCardStrip
          section={section}
          values={values}
          activeIndex={activeIndex}
          onCardClick={navigateToEntry}
          onAppendNew={handleAppend}
          similarPairs={similarPairs}
          disabled={disabled}
        />
      )}
      {entries.map((entry, idx) => {
        const isExpanded = expanded.has(idx);
        return (
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
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => toggleExpanded(idx)}
              aria-expanded={isExpanded}
              className="flex flex-1 flex-wrap items-baseline gap-x-2 gap-y-1 text-left text-sm font-semibold text-slate-700 transition hover:text-brand-600"
            >
              <span className="flex items-center gap-1.5">
                <ChevronIcon expanded={isExpanded} />
                <span>{(section.repeatLabel ?? '条目 {n}').replace('{n}', String(idx + 1))}</span>
              </span>
              {!isExpanded && (
                <EntryPreviewText entry={entry as Record<string, unknown>} fields={section.fields} />
              )}
            </button>
            <div className="flex items-center gap-3 shrink-0">
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
          </div>

          {isBrainstormLike && similarPairs.get(idx) && similarPairs.get(idx)!.length > 0 && (
            <div className="mb-2 mt-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs leading-relaxed text-amber-700">
              <span className="font-semibold">⚠ 与已有原因相似：</span>
              {(similarPairs.get(idx) as SimilarPair[]).map((p: SimilarPair, i: number) => (
                <span key={p.idx}>
                  <button
                    type="button"
                    onClick={() => navigateToEntry(p.idx)}
                    className="font-medium text-amber-800 underline decoration-dotted underline-offset-2 hover:text-amber-950"
                  >
                    「原因 {p.idx + 1}」（相似度 {(p.score * 100).toFixed(0)}%）
                  </button>
                  {i < (similarPairs.get(idx) as SimilarPair[]).length - 1 && '、'}
                </span>
              ))}
              <span className="text-amber-500">—— 内容相近，注意区分或考虑合并</span>
            </div>
          )}

          {isExpanded && (
            <>
              {section.id !== 'brainstorm' && section.id !== 'factors' && idx > 0 && (
                <div className="mb-3 space-y-1.5">
                  <p className="text-xs font-medium text-slate-400">前序内容回顾</p>
                  {Array.from({ length: idx }, (_, i) => (
                    <EntrySummary key={i} section={section} idx={i} values={values} />
                  ))}
                </div>
              )}
              {isWhyChain && idx === 0 && brainstormCauses.length > 0 && (
                <WhyFirstLevelPicker
                  causes={brainstormCauses}
                  currentValue={typeof (entry as Record<string, unknown>).why === 'string' ? ((entry as Record<string, unknown>).why as string) : ''}
                  onSelect={(cause) => setValue(`${section.id}.${idx}.why`, cause, { shouldDirty: true })}
                  disabled={disabled}
                />
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldList
                  fields={section.fields}
                  basePath={`${section.id}.${idx}.`}
                  disabled={disabled}
                  templateId={templateId}
                  historyRecords={historyRecords}
                  problem={problem}
                />
              </div>
              {/* 上一条/下一条导航：填写完不必滚回顶部卡片条，直接切到相邻条目 */}
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  disabled={idx === 0 || disabled}
                  onClick={() => navigateToEntry(idx - 1)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← 上一条
                </button>
                <span className="text-xs text-slate-400">第 {idx + 1} / {entries.length} 条</span>
                <button
                  type="button"
                  disabled={idx >= entries.length - 1 || disabled}
                  onClick={() => navigateToEntry(idx + 1)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  下一条 →
                </button>
              </div>
            </>
          )}
        </div>
        );
      })}
      {!disabled && !shouldStopAppend && section.id !== 'brainstorm' && (
        <button
          type="button"
          onClick={handleAppend}
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
