/**
 * 因果链引导输入组件（"逐对判断因果关系"）。
 * 交互流程：
 * 1. 先从头脑风暴候选原因中选择参与分析的因素（至少 2 个，可手动添加）；
 * 2. 系统对所选因素做"两两配对"，用户逐个判断每对因素的关系类型（正/负反馈、因果等）；
 * 3. 判断结果写入表单值树的 causalChain 数组，供后续分析使用。
 * 核心概念：
 * - 用 useFieldArray 管理 causalChain 数组，通过点路径 name='causalChain' 与上层表单打通；
 * - 组件用 memo 包裹做渲染优化（见下方 JSDoc 里的解释）；
 * - 本组件是"受控于表单值 + 本地派生 UI 状态"的典型例子：selectedFactors 等本地 state
 *   只做 UI 展示用，真正的数据落点是 causalChain。
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import clsx from 'clsx';
import type { Problem } from '../../types';

/** 关系类型候选：value 存进表单值，label 用 A/B 占位符展示，desc 是给用户看的中文解释。 */
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

/** 延迟效应候选：描述因素间的作用在时间上有多快显现。 */
const DELAY_OPTIONS = [
  { value: 'immediate', label: '即时' },
  { value: 'shortTerm', label: '短期（天）' },
  { value: 'midTerm', label: '中期（周-月）' },
  { value: 'longTerm', label: '长期（季-年）' },
];

/** 组件 props：disabled 是否禁用全部交互；problem 携带上一阶段（头脑风暴）的原因数据。 */
interface CausalChainGuidedInputProps {
  disabled?: boolean;
  problem?: Problem;
}

/** causalChain 数组里每条记录的形态：一对因素 + 关系类型 + 延迟效应 + 佐证。 */
interface PairData {
  factorA: string;
  factorB: string;
  relationType: string;
  delayEffect: string;
  evidence: string;
}

/**
 * 因果链引导输入组件（默认导出）。
 * 关于 React.memo（初学者重点）：
 * - memo(组件) 让"父组件重新渲染但传入的 props（disabled/problem）没变"时跳过本组件渲染；
 * - 但注意坑：如果父组件每次渲染都创建新的函数/对象传给本组件，memo 就失效了。
 *   这里本组件的 props 只有 disabled（原始类型）和 problem（引用稳定），所以 memo 有效；
 * - 另外本组件内部用 useMemo/useCallback 缓存派生数据，避免每敲一个键都重算全部配对。
 */
export const CausalChainGuidedInput = memo(function CausalChainGuidedInput({ disabled, problem }: CausalChainGuidedInputProps) {
  const { control, watch } = useFormContext();
  // useFieldArray：管理 causalChain 数组形态的表单值；append 追加、update 改写、remove 删除
  const { append, update, remove } = useFieldArray({ control, name: 'causalChain' });
  // watch 实时监听数组内容，每次值变化都会触发本组件重新渲染
  const causalChainValues = watch('causalChain') as PairData[] | undefined;

  /**
   * 清理残留空 entry：buildDefaultValues 会按 minEntries 预填 1 条空 entry
   * （factorA=''、factorB=''）。如果不清理，validateRequiredFields 会把它当作
   * 真正的"未填"，错误地弹出 banner；并且它会污染 existingPairs 的统计。
   * 仅执行一次（用 ref 防重复）。
   */
  const cleanedRef = useRef(false);
  useEffect(() => {
    if (cleanedRef.current) return;
    if (!Array.isArray(causalChainValues)) {
      cleanedRef.current = true;
      return;
    }
    cleanedRef.current = true;

    // 收集所有 factorA 或 factorB 为空（残留占位）的条目下标
    const emptyIndices: number[] = [];
    causalChainValues.forEach((entry, idx) => {
      const a = typeof entry?.factorA === 'string' ? entry.factorA.trim() : '';
      const b = typeof entry?.factorB === 'string' ? entry.factorB.trim() : '';
      if (!a || !b) emptyIndices.push(idx);
    });
    // 注意从后往前删：remove 会改变数组下标，倒序删除才能保证下标仍然有效
    for (const idx of emptyIndices.reverse()) {
      remove(idx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 从 problem 中提取上一阶段头脑风暴产出的候选原因（只保留非空字符串）
  const brainstormCauses = useMemo(() => {
    if (!problem) return [];
    const brainstorm = problem.data?.['brainstorm'];
    if (!Array.isArray(brainstorm)) return [];
    return brainstorm
      .map((item) => (typeof item?.cause === 'string' ? item.cause.trim() : ''))
      .filter((c) => c.length > 0);
  }, [problem]);

  // 当前已选中的因素列表（本地 UI state）。用 useState 的惰性初始化函数在首次渲染时
  // 从已有 causalChain 数据反推出已选因素，保证"从其他阶段跳回来"时选择状态能还原。
  const [selectedFactors, setSelectedFactors] = useState<string[]>(() => {
    if (!Array.isArray(causalChainValues)) return [];
    const set = new Set<string>();
    for (const entry of causalChainValues) {
      if (entry.factorA?.trim()) set.add(entry.factorA.trim());
      if (entry.factorB?.trim()) set.add(entry.factorB.trim());
    }
    return Array.from(set);
  });

  // showPicker：是否显示"选择因素"界面（初次进入或没有选中因素时为 true）；
  // currentPairIndex：当前正在判断第几组配对（步进器的游标）。
  const [showPicker, setShowPicker] = useState(selectedFactors.length === 0);
  const [currentPairIndex, setCurrentPairIndex] = useState(0);

  // 所有两两配对的下标组合 {i, j}（i < j）。注意这里存的是 selectedFactors 的下标，
  // 而非因素本身——因素可能很长，用下标引用更轻量。
  const allPairs = useMemo(() => {
    const pairs: { i: number; j: number }[] = [];
    for (let i = 0; i < selectedFactors.length; i++) {
      for (let j = i + 1; j < selectedFactors.length; j++) {
        pairs.push({ i, j });
      }
    }
    return pairs;
  }, [selectedFactors]);

  // 按 (factorA, factorB) 精确匹配找到对应的 causalChain 条目（找不到返回 undefined）
  const getPairEntry = useCallback(
    (factorA: string, factorB: string): PairData | undefined => {
      if (!Array.isArray(causalChainValues)) return undefined;
      return causalChainValues.find(
        (e) => e.factorA?.trim() === factorA && e.factorB?.trim() === factorB,
      );
    },
    [causalChainValues],
  );

  // 与 getPairEntry 类似，但返回该条目在数组中的下标（找不到返回 -1）。
  // useCallback 缓存 + 依赖 causalChainValues：causalChain 内容一变，回调自动换成新版本。
  const getEntryIndex = useCallback(
    (factorA: string, factorB: string): number => {
      if (!Array.isArray(causalChainValues)) return -1;
      return causalChainValues.findIndex(
        (e) => e.factorA?.trim() === factorA && e.factorB?.trim() === factorB,
      );
    },
    [causalChainValues],
  );

  // 用户在选择器界面点"开始逐对分析"时的回调：确认因素列表。
  function handleFactorsConfirm(factors: string[]) {
    // 防御性清理残留空 entry（用户可能从"重新选择因素"回到选择器后追加了因素）
    if (Array.isArray(causalChainValues)) {
      const emptyIndices: number[] = [];
      causalChainValues.forEach((entry, idx) => {
        const a = typeof entry?.factorA === 'string' ? entry.factorA.trim() : '';
        const b = typeof entry?.factorB === 'string' ? entry.factorB.trim() : '';
        if (!a || !b) emptyIndices.push(idx);
      });
      for (const idx of emptyIndices.reverse()) {
        remove(idx);
      }
    }

    setSelectedFactors(factors);
    setShowPicker(false); // 关闭选择器，进入逐对判断
    setCurrentPairIndex(0); // 游标回到第一对

    // 把已有条目的"正序/逆序"两种 key 都记录进 Set，用于判断某对是否已存在。
    // 顺序不敏感：用户先判断 (A,B) 还是 (B,A) 都算同一条。
    const existingPairs = new Set(
      (causalChainValues ?? []).map((e) => `${e.factorA?.trim()}|||${e.factorB?.trim()}`),
    );

    // 对每个新选中的两两组合，若正序和逆序都不存在，就 append 一条空记录等用户填写
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

  // 用户点击某个关系类型按钮时的回调：把选择写回 causalChain 数组。
  function handleSetRelation(pairIdx: number, relationType: string) {
    const pair = allPairs[pairIdx];
    if (!pair) return;
    const factorA = selectedFactors[pair.i];
    const factorB = selectedFactors[pair.j];
    const entryIdx = getEntryIndex(factorA, factorB);
    if (entryIdx >= 0) {
      // 用 update 改写整条 entry（react-hook-form 在 array 下 setValue 嵌套字段在某些时序下不生效）
      const cur = causalChainValues?.[entryIdx];
      update(entryIdx, {
        factorA: cur?.factorA ?? factorA,
        factorB: cur?.factorB ?? factorB,
        relationType,
        delayEffect: cur?.delayEffect ?? '',
        evidence: cur?.evidence ?? '',
      });
    } else {
      // entry 不存在（时序问题：factors 已选但 causalChainValues 还没刷新），主动 append
      append({ factorA, factorB, relationType, delayEffect: '', evidence: '' });
    }
    // 判断完一组后自动前进到下一组（最后一组则停留）
    if (currentPairIndex < allPairs.length - 1) {
      setCurrentPairIndex(currentPairIndex + 1);
    }
  }

  // 已填写关系类型的对数（进度统计）
  const filledCount = useMemo(() => {
    let count = 0;
    for (const pair of allPairs) {
      const entry = getPairEntry(selectedFactors[pair.i], selectedFactors[pair.j]);
      if (entry?.relationType && entry.relationType !== '') count++;
    }
    return count;
  }, [allPairs, selectedFactors, getPairEntry]);

  // "有效因果链"：关系类型不是空也不是 'none'（无关）的条目才算真正的因果链，
  // 供底部摘要列表展示，也会影响后续阶段的输入。
  const effectivePairs = useMemo(() => {
    return allPairs.filter((pair) => {
      const entry = getPairEntry(selectedFactors[pair.i], selectedFactors[pair.j]);
      return entry?.relationType && entry.relationType !== 'none' && entry.relationType !== '';
    });
  }, [allPairs, selectedFactors, getPairEntry]);

  // 需要先选因素：显示选择器界面；否则进入逐对判断界面
  if (showPicker || selectedFactors.length < 2) {
    return (
      <FactorSelector
        brainstormCauses={brainstormCauses}
        initialSelected={selectedFactors}
        onConfirm={handleFactorsConfirm}
      />
    );
  }

  // 当前正在判断的那一对：currentPairIndex 越界时收敛到最后一对，保证不会出现 undefined
  const currentPair = allPairs[Math.min(currentPairIndex, allPairs.length - 1)];
  const currentFactorA = selectedFactors[currentPair?.i ?? 0];
  const currentFactorB = selectedFactors[currentPair?.j ?? 0];
  const currentEntry = getPairEntry(currentFactorA, currentFactorB);

  return (
    <div className="space-y-4">
      {/* 顶部进度条：显示因素数、对数、已填数与有效因果链数，并提供"重新选择因素"入口 */}
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
          {/* 关系类型选项按钮：点击即写入 causalChain；title 里把 A/B 占位符替换成真实因素名 */}
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

        <div className="mt-5 flex items-center justify-between">
          {/* 上一对 / 下一对：左右移动 currentPairIndex 游标，边界处按钮禁用 */}
          <button
            type="button"
            disabled={currentPairIndex === 0 || disabled}
            onClick={() => setCurrentPairIndex(currentPairIndex - 1)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
          >
            ← 上一对
          </button>
          {/* 中间的小圆点导航：每对一组，已填的亮浅色，当前组亮深色；对数超过 50 就不渲染避免性能问题 */}
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

      {/* 底部摘要：把已确认的非"无关"关系列出来，让用户随时回看已填内容 */}
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

/** FactorSelector 的 props：brainstormCauses 候选原因，initialSelected 已选因素，onConfirm 确认回调。 */
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

/**
 * "选择参与分析的因素"选择器界面（CausalChainGuidedInput 的内部子组件）。
 * - 提供：候选原因多选（带全选/反选）、手动添加自定义因素、已选项实时统计；
 * - selected 用 Set<number> 存勾选的候选下标（去重且 O(1) 判断）；
 * - customFactors 单独存手动添加的因素，二者合并后才是最终因素列表。
 */
function FactorSelector({ brainstormCauses, initialSelected, onConfirm }: FactorSelectorProps) {
  // 用 useState 的惰性初始化：把"已选因素"与候选原因做不区分大小写的匹配，
  // 预先把对应的候选下标勾选上（这样从逐对判断返回时能保留上次的选择）
  const [selected, setSelected] = useState<Set<number>>(() => {
    const set = new Set<number>();
    const lowerInitial = new Set(initialSelected.map((s) => s.toLowerCase()));
    brainstormCauses.forEach((c, idx) => {
      if (lowerInitial.has(c.toLowerCase())) set.add(idx);
    });
    return set;
  });
  const [customFactor, setCustomFactor] = useState(''); // 手动添加输入框的临时值
  // 手动添加过的因素：凡是候选原因里没有的已选因素，就认为是用户自定义的
  const [customFactors, setCustomFactors] = useState<string[]>(
    initialSelected.filter((s) => !brainstormCauses.some((c) => c.toLowerCase() === s.toLowerCase())),
  );

  // 勾选/取消勾选某个候选原因：每次用"拷贝原 Set 再改"的方式创建新 Set，
  // 保证 React 能检测到 state 变化触发重渲染
  function handleToggle(idx: number) {
    const next = new Set(selected);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelected(next);
  }

  // 把输入框里的自定义因素加入列表，并清空输入框
  function handleAddCustom() {
    if (customFactor.trim()) {
      setCustomFactors([...customFactors, customFactor.trim()]);
      setCustomFactor('');
    }
  }

  // 点"开始逐对分析"：合并勾选的候选 + 自定义因素；不足 2 个不允许继续
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

      {/* 候选原因列表（可滚动）：每个原因前一个受控 checkbox，选中状态来自 selected Set */}
      {brainstormCauses.length > 0 && (
        <div className="space-y-2">
          {/* 全选 / 反选 / 已选计数 */}
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

      {/* 手动添加自定义因素：输入框回车或点"添加"都会加入 customFactors */}
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

      {/* 已添加的自定义因素标签列表，带 × 可删除 */}
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

      {/* 底部确认区：实时预览将要生成的配对数量；不足 2 个因素时禁用按钮 */}
      <div
        className={clsx(
          'flex flex-col gap-2 rounded-md border p-3 transition',
          totalSelected >= 2
            ? 'border-brand-300 bg-white'
            : 'border-dashed border-slate-300 bg-slate-50/60',
        )}
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className={clsx('text-sm', totalSelected >= 2 ? 'text-brand-800' : 'text-slate-500')}>
            {totalSelected >= 2 ? (
              <>
                已选 <strong>{totalSelected}</strong> 个因素，将生成{' '}
                <strong>{totalSelected * (totalSelected - 1) / 2}</strong> 对因果关系供你逐对判断
              </>
            ) : (
              <>至少选 2 个因素后才能开始</>
            )}
          </p>
          {totalSelected >= 2 && (
            <span className="text-xs text-amber-600 leading-relaxed shrink-0">
              需点击下方按钮才会写入因果链
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={totalSelected < 2}
          className="rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          {totalSelected >= 2
            ? `开始逐对分析（共 ${totalSelected * (totalSelected - 1) / 2} 对） →`
            : '开始逐对分析'}
        </button>
      </div>
    </div>
  );
}
