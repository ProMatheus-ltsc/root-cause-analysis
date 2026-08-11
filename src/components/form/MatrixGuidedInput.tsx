import { useCallback, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import clsx from 'clsx';
import type { FormField } from '../../types';
import { CAUSE_SCORE_ROOT, CAUSE_SCORE_SURFACE, KEY_FACTOR_MAX } from '../../templates/shared';

const STRENGTH_OPTIONS = [
  { value: 0, label: '0 无关', desc: '两因素之间无因果关联' },
  { value: 1, label: '1 弱', desc: '单向弱关联（i 轻微影响 j）' },
  { value: 2, label: '2 中', desc: '双向关联或单向强关联' },
  { value: 4, label: '4 强', desc: '互为强因果（i 强烈驱动 j）' },
];

interface MatrixGuidedInputProps {
  field: FormField;
  name: string;
  disabled?: boolean;
}

interface CellPair {
  i: number;
  j: number;
}

export function MatrixGuidedInput({ field, name, disabled }: MatrixGuidedInputProps) {
  const { watch, setValue } = useFormContext();
  const factors = watch('factors') as Array<Record<string, unknown>> | undefined;
  const matrixValue = watch(name) as Array<Record<string, unknown>> | undefined;

  const factorNames = useMemo(() => {
    if (!Array.isArray(factors)) return [];
    return factors
      .slice(0, KEY_FACTOR_MAX)
      .map((f, idx) => (typeof f?.name === 'string' && f.name.trim() ? f.name.trim() : `因素 ${idx + 1}`));
  }, [factors]);

  const n = factorNames.length;

  const allPairs = useMemo(() => {
    const pairs: CellPair[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) pairs.push({ i, j });
      }
    }
    return pairs;
  }, [n]);

  const [mode, setMode] = useState<'guided' | 'overview' | 'scores'>('guided');
  const [currentPairIndex, setCurrentPairIndex] = useState(0);

  const getCellValue = useCallback(
    (i: number, j: number): number => {
      if (!Array.isArray(matrixValue) || !matrixValue[i]) return 0;
      const v = matrixValue[i][`c${j}`];
      const num = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(num) ? num : 0;
    },
    [matrixValue],
  );

  const setCellValue = useCallback(
    (i: number, j: number, value: number) => {
      const rows = Array.isArray(matrixValue) ? [...matrixValue] : [];
      while (rows.length < KEY_FACTOR_MAX) {
        rows.push(Object.fromEntries(Array.from({ length: KEY_FACTOR_MAX }, (_, k) => [`c${k}`, 0])));
      }
      const row = { ...rows[i] };
      row[`c${j}`] = value;
      rows[i] = row;
      setValue(name, rows, { shouldDirty: true });
    },
    [matrixValue, name, setValue],
  );

  const filledCount = useMemo(() => {
    let count = 0;
    for (const pair of allPairs) {
      if (getCellValue(pair.i, pair.j) !== 0) count++;
    }
    return count;
  }, [allPairs, getCellValue]);

  if (n < 2) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        请先在"因素清单"阶段添加至少 2 个因素后，再进行关系矩阵填写。
      </div>
    );
  }

  const totalPairs = allPairs.length;
  const currentPair = allPairs[Math.min(currentPairIndex, totalPairs - 1)];

  const causeScores = useMemo(() => {
    const outCount = Array.from({ length: n }, () => 0);
    const inCount = Array.from({ length: n }, () => 0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        if (getCellValue(i, j) > 0) {
          outCount[i] += 1;
          inCount[j] += 1;
        }
      }
    }
    return factorNames.map((fname, idx) => {
      const score = inCount[idx] - outCount[idx];
      let role: string;
      if (score < CAUSE_SCORE_ROOT) role = '根因';
      else if (score > CAUSE_SCORE_SURFACE) role = '表因';
      else role = '过因';
      return { name: fname, outCount: outCount[idx], inCount: inCount[idx], score, role };
    });
  }, [n, factorNames, getCellValue]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setMode('guided')}
          disabled={disabled}
          className={clsx(
            'rounded-md px-3 py-1.5 text-sm font-medium transition',
            mode === 'guided' ? 'bg-sky-600 text-white' : 'border border-slate-300 text-slate-600 hover:bg-slate-100',
          )}
        >
          逐对填写
        </button>
        <button
          type="button"
          onClick={() => setMode('overview')}
          disabled={disabled}
          className={clsx(
            'rounded-md px-3 py-1.5 text-sm font-medium transition',
            mode === 'overview' ? 'bg-sky-600 text-white' : 'border border-slate-300 text-slate-600 hover:bg-slate-100',
          )}
        >
          矩阵总览
        </button>
        <button
          type="button"
          onClick={() => setMode('scores')}
          disabled={disabled}
          className={clsx(
            'rounded-md px-3 py-1.5 text-sm font-medium transition',
            mode === 'scores' ? 'bg-sky-600 text-white' : 'border border-slate-300 text-slate-600 hover:bg-slate-100',
          )}
        >
          因果得分
        </button>
        <span className="text-xs text-slate-400">
          已填写 {filledCount}/{totalPairs} 对（不含对角线和"无关"项）
        </span>
      </div>

      <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500 space-y-1">
        <p><strong>第一类：影响强度矩阵</strong> — 行 i 对列 j 的影响强度：0=无关｜1=弱（单向弱关联）｜2=中（双向/单向强关联）｜4=强（互为强因果）</p>
        <p><strong>第二类：因果方向得分（自动计算）</strong> — 两两比较：若 i→j 有影响（强度&gt;0），则 i 是"因"（−1）、j 是"果"（+1）累计得分。得分最低→根因，最高→表因，接近 0（−2~2）→过因</p>
      </div>

      {mode === 'guided' && (
        <GuidedMode
          factorNames={factorNames}
          allPairs={allPairs}
          currentPairIndex={currentPairIndex}
          setCurrentPairIndex={setCurrentPairIndex}
          getCellValue={getCellValue}
          setCellValue={setCellValue}
          currentPair={currentPair}
          totalPairs={totalPairs}
          disabled={disabled}
        />
      )}

      {mode === 'overview' && (
        <OverviewMode
          factorNames={factorNames}
          n={n}
          getCellValue={getCellValue}
          setCellValue={setCellValue}
          disabled={disabled}
        />
      )}

      {mode === 'scores' && (
        <CauseScorePanel causeScores={causeScores} />
      )}

      {field.hint && <p className="text-xs text-slate-400">{field.hint}</p>}
    </div>
  );
}

interface GuidedModeProps {
  factorNames: string[];
  allPairs: CellPair[];
  currentPairIndex: number;
  setCurrentPairIndex: (idx: number) => void;
  getCellValue: (i: number, j: number) => number;
  setCellValue: (i: number, j: number, value: number) => void;
  currentPair: CellPair;
  totalPairs: number;
  disabled?: boolean;
}

function GuidedMode({
  factorNames,
  allPairs,
  currentPairIndex,
  setCurrentPairIndex,
  getCellValue,
  setCellValue,
  currentPair,
  totalPairs,
  disabled,
}: GuidedModeProps) {
  const currentValue = getCellValue(currentPair.i, currentPair.j);

  function handleSelect(value: number) {
    setCellValue(currentPair.i, currentPair.j, value);
    if (currentPairIndex < totalPairs - 1) {
      setCurrentPairIndex(currentPairIndex + 1);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-2 text-xs text-slate-400">
        第 {currentPairIndex + 1} / {totalPairs} 对
      </div>
      <div className="mb-4 text-center">
        <span className="text-base font-semibold text-slate-800">
          「{factorNames[currentPair.i]}」
        </span>
        <span className="mx-2 text-slate-400">→ 对 →</span>
        <span className="text-base font-semibold text-slate-800">
          「{factorNames[currentPair.j]}」
        </span>
        <p className="mt-1 text-sm text-slate-500">的影响强度是？</p>
        <p className="mt-0.5 text-xs text-slate-400">（若选 1/2/4，系统将计「{factorNames[currentPair.i]}」为因(−1)、「{factorNames[currentPair.j]}」为果(+1)）</p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {STRENGTH_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => handleSelect(opt.value)}
            className={clsx(
              'rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition',
              currentValue === opt.value
                ? 'border-sky-500 bg-sky-50 text-sky-700'
                : 'border-slate-200 text-slate-600 hover:border-sky-300 hover:bg-sky-50',
            )}
            title={opt.desc}
          >
            {opt.label}
          </button>
        ))}
      </div>

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
          {allPairs.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentPairIndex(idx)}
              className={clsx(
                'h-2 w-2 rounded-full transition',
                idx === currentPairIndex ? 'bg-sky-500' : getCellValue(allPairs[idx].i, allPairs[idx].j) !== 0 ? 'bg-sky-200' : 'bg-slate-200',
              )}
              style={{ display: totalPairs > 50 ? 'none' : undefined }}
            />
          ))}
        </div>
        <button
          type="button"
          disabled={currentPairIndex >= totalPairs - 1 || disabled}
          onClick={() => setCurrentPairIndex(currentPairIndex + 1)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
        >
          下一对 →
        </button>
      </div>
    </div>
  );
}

interface OverviewModeProps {
  factorNames: string[];
  n: number;
  getCellValue: (i: number, j: number) => number;
  setCellValue: (i: number, j: number, value: number) => void;
  disabled?: boolean;
}

function OverviewMode({ factorNames, n, getCellValue, setCellValue, disabled }: OverviewModeProps) {
  const [editingCell, setEditingCell] = useState<CellPair | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white px-2 py-1 text-left font-medium text-slate-500">↓行 \ 列→</th>
            {factorNames.slice(0, n).map((fname, j) => (
              <th key={j} className="min-w-[60px] border-b border-slate-200 px-1 py-1 text-center font-medium text-slate-600" title={fname}>
                {fname.length > 4 ? fname.slice(0, 4) + '…' : fname}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {factorNames.slice(0, n).map((rowName, i) => (
            <tr key={i}>
              <td className="sticky left-0 z-10 bg-white border-r border-slate-100 px-2 py-1 text-left font-medium text-slate-600 whitespace-nowrap" title={rowName}>
                {rowName.length > 6 ? rowName.slice(0, 6) + '…' : rowName}
              </td>
              {factorNames.slice(0, n).map((_, j) => {
                if (i === j) {
                  return (
                    <td key={j} className="border border-slate-100 bg-slate-50 px-1 py-1 text-center text-slate-300">
                      —
                    </td>
                  );
                }
                const val = getCellValue(i, j);
                const isEditing = editingCell?.i === i && editingCell?.j === j;
                return (
                  <td
                    key={j}
                    className={clsx(
                      'border border-slate-100 px-1 py-1 text-center cursor-pointer transition',
                      val > 0 ? 'bg-sky-50 font-semibold text-sky-700' : 'text-slate-400',
                      isEditing && 'ring-2 ring-sky-400',
                    )}
                    onClick={() => !disabled && setEditingCell({ i, j })}
                    title={`${rowName} → ${factorNames[j]}`}
                  >
                    {isEditing ? (
                      <select
                        autoFocus
                        className="w-full border-none bg-transparent text-center text-xs outline-none"
                        value={val}
                        onChange={(e) => {
                          setCellValue(i, j, Number(e.target.value));
                          setEditingCell(null);
                        }}
                        onBlur={() => setEditingCell(null)}
                      >
                        {STRENGTH_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.value}</option>
                        ))}
                      </select>
                    ) : (
                      val
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-400">点击单元格可直接修改。行 → 列 表示"行因素对列因素"的影响强度（0=无关 / 1=弱 / 2=中 / 4=强）。若 i→j 强度&gt;0，系统自动计为 i 是"因"（−1）、j 是"果"（+1）。</p>
    </div>
  );
}

interface CauseScoreItem {
  name: string;
  outCount: number;
  inCount: number;
  score: number;
  role: string;
}

function CauseScorePanel({ causeScores }: { causeScores: CauseScoreItem[] }) {
  const sorted = [...causeScores].sort((a, b) => a.score - b.score);

  if (sorted.length === 0) {
    return <p className="text-sm text-slate-400">填写矩阵后自动计算因果得分</p>;
  }

  function roleColor(role: string) {
    if (role === '根因') return 'bg-rose-100 text-rose-700 border-rose-200';
    if (role === '表因') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        因果方向得分 = 作为果次数(inCount) − 作为因次数(outCount)。得分最低→根因（最源头），最高→表因（最表象），接近 0（−2~2）→过因（中间传导）。
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
              <th className="px-3 py-2">因素</th>
              <th className="px-3 py-2 text-center">作为因（−1）</th>
              <th className="px-3 py-2 text-center">作为果（+1）</th>
              <th className="px-3 py-2 text-center">得分</th>
              <th className="px-3 py-2 text-center">判定</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item, idx) => (
              <tr key={idx} className="border-b border-slate-100">
                <td className="px-3 py-2 font-medium text-slate-700">{item.name}</td>
                <td className="px-3 py-2 text-center text-slate-600">{item.outCount}</td>
                <td className="px-3 py-2 text-center text-slate-600">{item.inCount}</td>
                <td className="px-3 py-2 text-center font-semibold">{item.score}</td>
                <td className="px-3 py-2 text-center">
                  <span className={clsx('inline-block rounded-full border px-2 py-0.5 text-xs font-medium', roleColor(item.role))}>
                    {item.role}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-md border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-700 space-y-0.5">
        <p>▸ <strong>根因</strong>（得分 &lt; −2）：影响其他因素多、被影响少 → 最源头的原因</p>
        <p>▸ <strong>过因</strong>（得分 −2~2）：既影响其他也被影响 → 中间传导因素</p>
        <p>▸ <strong>表因</strong>（得分 &gt; 2）：被影响多、影响其他少 → 最表面的现象</p>
      </div>
    </div>
  );
}
