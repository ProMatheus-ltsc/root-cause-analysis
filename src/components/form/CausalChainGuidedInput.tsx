import { memo, useCallback, useMemo, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import clsx from 'clsx';
import type { Problem } from '../../types';

const RELATION_OPTIONS = [
  { value: 'reinforcing', label: 'A↑ → B↑', desc: 'A 增加导致 B 增加（正反馈）' },
  { value: 'reinforcing_rev', label: 'B↑ → A↑', desc: 'B 增加导致 A 增加（正反馈，反向）' },
  { value: 'balancing', label: 'A↑ → B↓', desc: 'A 增加导致 B 减少（负反馈）' },
  { value: 'balancing_rev', label: 'B↑ → A↓', desc: 'B 增加导致 A 减少（负反馈，反向）' },
  { value: 'causal', label: 'A → B', desc: 'A 触发 B 发生（因果链）' },
  { value: 'causal_rev', label: 'B → A', desc: 'B 触发 A 发生（因果链，反向）' },
  { value: 'mutual', label: 'A ⟷ B', desc: '互为因果（双向影响）' },
  { value: 'none', label: '无关', desc: '两因素之间无因果关系' },
];

const DELAY_OPTIONS = [
  { value: 'immediate', label: '即时' },
  { value: 'shortTerm', label: '短期（天）' },
  { value: 'midTerm', label: '中期（周-月）' },
  { value: 'longTerm', label: '长期（季-年）' },
];

interface CausalChainGuidedInputProps {
  disabled?: boolean;
  problem?: Problem;
}

interface PairData {
  factorA: string;
  factorB: string;
  relationType: string;
  delayEffect: string;
  evidence: string;
}

export const CausalChainGuidedInput = memo(function CausalChainGuidedInput({ disabled, problem }: CausalChainGuidedInputProps) {
  const { control, watch, setValue } = useFormContext();
  const { append } = useFieldArray({ control, name: 'causalChain' });
  const causalChainValues = watch('causalChain') as PairData[] | undefined;

  const brainstormCauses = useMemo(() => {
    if (!problem) return [];
    const brainstorm = problem.data?.['brainstorm'];
    if (!Array.isArray(brainstorm)) return [];
    return brainstorm
      .map((item) => (typeof item?.cause === 'string' ? item.cause.trim() : ''))
      .filter((c) => c.length > 0);
  }, [problem]);

  const [selectedFactors, setSelectedFactors] = useState<string[]>(() => {
    if (!Array.isArray(causalChainValues)) return [];
    const set = new Set<string>();
    for (const entry of causalChainValues) {
      if (entry.factorA?.trim()) set.add(entry.factorA.trim());
      if (entry.factorB?.trim()) set.add(entry.factorB.trim());
    }
    return Array.from(set);
  });

  const [showPicker, setShowPicker] = useState(selectedFactors.length === 0);
  const [currentPairIndex, setCurrentPairIndex] = useState(0);

  const allPairs = useMemo(() => {
    const pairs: { i: number; j: number }[] = [];
    for (let i = 0; i < selectedFactors.length; i++) {
      for (let j = i + 1; j < selectedFactors.length; j++) {
        pairs.push({ i, j });
      }
    }
    return pairs;
  }, [selectedFactors]);

  const getPairEntry = useCallback(
    (factorA: string, factorB: string): PairData | undefined => {
      if (!Array.isArray(causalChainValues)) return undefined;
      return causalChainValues.find(
        (e) => e.factorA?.trim() === factorA && e.factorB?.trim() === factorB,
      );
    },
    [causalChainValues],
  );

  const getEntryIndex = useCallback(
    (factorA: string, factorB: string): number => {
      if (!Array.isArray(causalChainValues)) return -1;
      return causalChainValues.findIndex(
        (e) => e.factorA?.trim() === factorA && e.factorB?.trim() === factorB,
      );
    },
    [causalChainValues],
  );

  function handleFactorsConfirm(factors: string[]) {
    setSelectedFactors(factors);
    setShowPicker(false);
    setCurrentPairIndex(0);

    const existingPairs = new Set(
      (causalChainValues ?? []).map((e) => `${e.factorA?.trim()}|||${e.factorB?.trim()}`),
    );

    for (let i = 0; i < factors.length; i++) {
      for (let j = i + 1; j < factors.length; j++) {
        const key = `${factors[i]}|||${factors[j]}`;
        const keyReverse = `${factors[j]}|||${factors[i]}`;
        if (!existingPairs.has(key) && !existingPairs.has(keyReverse)) {
          append({ factorA: factors[i], factorB: factors[j], relationType: '', delayEffect: '', evidence: '' });
        }
      }
    }
  }

  function handleSetRelation(pairIdx: number, relationType: string) {
    const pair = allPairs[pairIdx];
    if (!pair) return;
    const factorA = selectedFactors[pair.i];
    const factorB = selectedFactors[pair.j];
    const entryIdx = getEntryIndex(factorA, factorB);
    if (entryIdx >= 0) {
      setValue(`causalChain.${entryIdx}.relationType`, relationType, { shouldDirty: true });
      if (relationType === 'none') {
        setValue(`causalChain.${entryIdx}.delayEffect`, '', { shouldDirty: true });
      }
    }
    if (currentPairIndex < allPairs.length - 1) {
      setCurrentPairIndex(currentPairIndex + 1);
    }
  }

  function handleSetDelay(pairIdx: number, delayEffect: string) {
    const pair = allPairs[pairIdx];
    if (!pair) return;
    const factorA = selectedFactors[pair.i];
    const factorB = selectedFactors[pair.j];
    const entryIdx = getEntryIndex(factorA, factorB);
    if (entryIdx >= 0) {
      setValue(`causalChain.${entryIdx}.delayEffect`, delayEffect, { shouldDirty: true });
    }
  }

  function handleSetEvidence(pairIdx: number, evidence: string) {
    const pair = allPairs[pairIdx];
    if (!pair) return;
    const factorA = selectedFactors[pair.i];
    const factorB = selectedFactors[pair.j];
    const entryIdx = getEntryIndex(factorA, factorB);
    if (entryIdx >= 0) {
      setValue(`causalChain.${entryIdx}.evidence`, evidence, { shouldDirty: true });
    }
  }

  const filledCount = useMemo(() => {
    let count = 0;
    for (const pair of allPairs) {
      const entry = getPairEntry(selectedFactors[pair.i], selectedFactors[pair.j]);
      if (entry?.relationType && entry.relationType !== '') count++;
    }
    return count;
  }, [allPairs, selectedFactors, getPairEntry]);

  const effectivePairs = useMemo(() => {
    return allPairs.filter((pair) => {
      const entry = getPairEntry(selectedFactors[pair.i], selectedFactors[pair.j]);
      return entry?.relationType && entry.relationType !== 'none' && entry.relationType !== '';
    });
  }, [allPairs, selectedFactors, getPairEntry]);

  if (showPicker || selectedFactors.length < 2) {
    return (
      <FactorSelector
        brainstormCauses={brainstormCauses}
        initialSelected={selectedFactors}
        onConfirm={handleFactorsConfirm}
      />
    );
  }

  const currentPair = allPairs[Math.min(currentPairIndex, allPairs.length - 1)];
  const currentFactorA = selectedFactors[currentPair?.i ?? 0];
  const currentFactorB = selectedFactors[currentPair?.j ?? 0];
  const currentEntry = getPairEntry(currentFactorA, currentFactorB);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-slate-500">
          已选 {selectedFactors.length} 个因素，共 {allPairs.length} 组 · 已填 {filledCount} 组 · 有效因果链 {effectivePairs.length} 条
        </span>
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="text-xs text-brand-600 hover:underline"
          disabled={disabled}
        >
          重新选择因素
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-2 text-xs text-slate-400">
          第 {currentPairIndex + 1} / {allPairs.length} 组
        </div>
        <div className="mb-4 text-center">
          <span className="text-base font-semibold text-slate-800">「{currentFactorA}」</span>
          <span className="mx-2 text-slate-400">⟷</span>
          <span className="text-base font-semibold text-slate-800">「{currentFactorB}」</span>
          <p className="mt-1 text-sm text-slate-500">这两个因素之间的因果关系是？（每组只需判断一次）</p>
        </div>

        <div className="flex flex-col gap-2">
          {RELATION_OPTIONS.map((opt) => {
            const isSelected = currentEntry?.relationType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                onClick={() => handleSetRelation(currentPairIndex, opt.value)}
                title={opt.desc.replace(/A/g, currentFactorA).replace(/B/g, currentFactorB)}
                className={clsx(
                  'flex w-full items-start gap-3 rounded-lg border-2 px-3.5 py-2.5 text-left transition',
                  isSelected
                    ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                    : 'border-surface-200 text-text-secondary hover:border-brand-300 hover:bg-brand-50/60',
                )}
              >
                <span
                  className={clsx(
                    'mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
                    isSelected ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500',
                  )}
                  aria-hidden="true"
                >
                  {isSelected ? '✓' : ''}
                </span>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="text-sm font-medium leading-relaxed text-slate-800 break-words">
                    <RichRelationLabel
                      template={opt.label}
                      factorA={currentFactorA}
                      factorB={currentFactorB}
                    />
                  </div>
                  <p className="text-xs leading-relaxed text-slate-500 break-words">
                    {opt.desc.replace(/A/g, currentFactorA).replace(/B/g, currentFactorB)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {currentEntry?.relationType && currentEntry.relationType !== 'none' && (
          <div className="mt-4 space-y-3">
            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-500">延迟效应</p>
              <div className="flex flex-wrap gap-2">
                {DELAY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleSetDelay(currentPairIndex, opt.value)}
                    className={clsx(
                      'rounded-md border px-3 py-1.5 text-xs transition',
                      currentEntry?.delayEffect === opt.value
                        ? 'border-brand-400 bg-brand-50 text-brand-700'
                                    : 'border-surface-200 text-text-tertiary hover:border-brand-300',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">证据（可选）</p>
              <textarea
                disabled={disabled}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                rows={2}
                placeholder="有什么数据或观察能证明这条因果关系存在？"
                value={currentEntry?.evidence ?? ''}
                onChange={(e) => handleSetEvidence(currentPairIndex, e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            disabled={currentPairIndex === 0 || disabled}
            onClick={() => setCurrentPairIndex(currentPairIndex - 1)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
          >
            ← 上一对
          </button>
          <div className="flex gap-1">
            {allPairs.length <= 50 && allPairs.map((_, idx) => {
              const pair = allPairs[idx];
              const entry = getPairEntry(selectedFactors[pair.i], selectedFactors[pair.j]);
              const filled = entry?.relationType && entry.relationType !== '';
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentPairIndex(idx)}
                  className={clsx(
                    'h-2 w-2 rounded-full transition',
                    idx === currentPairIndex ? 'bg-brand-500' : filled ? 'bg-brand-200' : 'bg-surface-200',
                  )}
                />
              );
            })}
          </div>
          <button
            type="button"
            disabled={currentPairIndex >= allPairs.length - 1 || disabled}
            onClick={() => setCurrentPairIndex(currentPairIndex + 1)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
          >
            下一对 →
          </button>
        </div>
      </div>

      {effectivePairs.length > 0 && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-xs font-medium text-slate-500">已确认的因果关系（{effectivePairs.length} 条）</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {effectivePairs.map((pair, idx) => {
              const a = selectedFactors[pair.i];
              const b = selectedFactors[pair.j];
              const entry = getPairEntry(a, b);
              const relLabel = RELATION_OPTIONS.find((o) => o.value === entry?.relationType)?.label ?? '';
              const delayLabel = DELAY_OPTIONS.find((o) => o.value === entry?.delayEffect)?.label ?? '';
              return (
                <div key={idx} className="text-xs text-slate-600 break-words">
                  <RichRelationLabel template={relLabel} factorA={a} factorB={b} />
                  {delayLabel && <span className="ml-1 text-slate-400">（{delayLabel}）</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

interface FactorSelectorProps {
  brainstormCauses: string[];
  initialSelected: string[];
  onConfirm: (factors: string[]) => void;
}

/**
 * 关系按钮里 A/B 占位的富渲染：把模板字符串中的每个 A / B token 替换为带颜色 + 完整因子名的 span，
 * 其余符号原样保留。这样长因子名也能完整展示、并自动换行，不会再被截断成省略号。
 */
function RichRelationLabel({ template, factorA, factorB }: { template: string; factorA: string; factorB: string }) {
  const tokens = template.split(/(A|B)/g);
  return (
    <>
      {tokens.map((token, idx) => {
        if (token === 'A') {
          return (
            <span key={idx} className="font-semibold text-emerald-600">
              {factorA}
            </span>
          );
        }
        if (token === 'B') {
          return (
            <span key={idx} className="font-semibold text-blue-600">
              {factorB}
            </span>
          );
        }
        return <span key={idx}>{token}</span>;
      })}
    </>
  );
}

function FactorSelector({ brainstormCauses, initialSelected, onConfirm }: FactorSelectorProps) {
  const [selected, setSelected] = useState<Set<number>>(() => {
    const set = new Set<number>();
    const lowerInitial = new Set(initialSelected.map((s) => s.toLowerCase()));
    brainstormCauses.forEach((c, idx) => {
      if (lowerInitial.has(c.toLowerCase())) set.add(idx);
    });
    return set;
  });
  const [customFactor, setCustomFactor] = useState('');
  const [customFactors, setCustomFactors] = useState<string[]>(
    initialSelected.filter((s) => !brainstormCauses.some((c) => c.toLowerCase() === s.toLowerCase())),
  );

  function handleToggle(idx: number) {
    const next = new Set(selected);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelected(next);
  }

  function handleAddCustom() {
    if (customFactor.trim()) {
      setCustomFactors([...customFactors, customFactor.trim()]);
      setCustomFactor('');
    }
  }

  function handleConfirm() {
    const factors = [
      ...Array.from(selected).sort().map((idx) => brainstormCauses[idx]),
      ...customFactors,
    ];
    if (factors.length >= 2) {
      onConfirm(factors);
    }
  }

  const totalSelected = selected.size + customFactors.length;

  return (
    <div className="rounded-lg border border-brand-200 bg-brand-50/60 p-4 space-y-4">
      <div>
        <p className="text-sm font-medium text-brand-800">选择参与因果链分析的因素（至少 2 个）</p>
        <p className="text-xs text-text-tertiary mt-1">从头脑风暴候选原因中勾选，系统将自动生成所有两两配对供你逐对判断因果关系</p>
      </div>

      {brainstormCauses.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                const all = new Set(brainstormCauses.map((_, idx) => idx));
                setSelected(all);
              }}
              className="rounded border border-brand-300 px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100 transition"
            >
              {selected.size === brainstormCauses.length ? '取消全选' : '全选'}
            </button>
            <button
              type="button"
              onClick={() => {
                const inverted = new Set<number>();
                for (let i = 0; i < brainstormCauses.length; i++) {
                  if (!selected.has(i)) inverted.add(i);
                }
                setSelected(inverted);
              }}
              className="rounded border border-brand-300 px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100 transition"
            >
              反选
            </button>
            {selected.size > 0 && (
              <span className="text-xs text-brand-600 leading-6">已选 {selected.size} / {brainstormCauses.length} 项</span>
            )}
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {brainstormCauses.map((cause, idx) => (
              <label key={idx} className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-brand-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(idx)}
                  onChange={() => handleToggle(idx)}
                  className="mt-0.5"
                />
                <span className="text-text-secondary">{idx + 1}. {cause}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {brainstormCauses.length === 0 && (
        <p className="text-xs text-amber-600">暂无头脑风暴候选原因，请手动添加因素</p>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 rounded-xl border border-surface-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          placeholder="手动添加因素…"
          value={customFactor}
          onChange={(e) => setCustomFactor(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustom())}
        />
        <button
          type="button"
          onClick={handleAddCustom}
          disabled={!customFactor.trim()}
          className="rounded-md bg-surface-200 px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-300 disabled:opacity-40"
        >
          添加
        </button>
      </div>

      {customFactors.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {customFactors.map((f, idx) => (
            <span key={idx} className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs text-brand-700">
              {f}
              <button type="button" onClick={() => setCustomFactors(customFactors.filter((_, i) => i !== idx))} className="text-brand-400 hover:text-brand-700">×</button>
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={totalSelected < 2}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
      >
        开始逐对分析（已选 {totalSelected} 个因素，{totalSelected * (totalSelected - 1) / 2} 组）
      </button>
    </div>
  );
}
