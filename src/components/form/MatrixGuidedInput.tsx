import { memo, useCallback, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import clsx from 'clsx';
import type { FormField } from '../../types';
import { CAUSE_SCORE_ROOT, CAUSE_SCORE_SURFACE, KEY_FACTOR_MAX } from '../../templates/shared';

const STRENGTH_OPTIONS = [
  { value: 1, label: '1 弱', desc: '单向弱关联' },
  { value: 2, label: '2 中', desc: '双向关联或单向强关联' },
  { value: 4, label: '4 强', desc: '互为强因果' },
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

type Step = 'direction' | 'scores' | 'strength';

export const MatrixGuidedInput = memo(function MatrixGuidedInput({ field, name, disabled }: MatrixGuidedInputProps) {
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
      for (let j = i + 1; j < n; j++) {
        pairs.push({ i, j });
      }
    }
    return pairs;
  }, [n]);

  const [step, setStep] = useState<Step>('direction');
  const [dirPairIndex, setDirPairIndex] = useState(0);
  const [strPairIndex, setStrPairIndex] = useState(0);

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

  const setDirectionPair = useCallback(
    (i: number, j: number, direction: 'i2j' | 'j2i' | 'none') => {
      const rows = Array.isArray(matrixValue) ? [...matrixValue] : [];
      while (rows.length < KEY_FACTOR_MAX) {
        rows.push(Object.fromEntries(Array.from({ length: KEY_FACTOR_MAX }, (_, k) => [`c${k}`, 0])));
      }
      const rowI = { ...rows[i] };
      const rowJ = { ...rows[j] };
      if (direction === 'i2j') {
        rowI[`c${j}`] = 1;
        rowJ[`c${i}`] = 0;
      } else if (direction === 'j2i') {
        rowI[`c${j}`] = 0;
        rowJ[`c${i}`] = 1;
      } else {
        rowI[`c${j}`] = 0;
        rowJ[`c${i}`] = 0;
      }
      rows[i] = rowI;
      rows[j] = rowJ;
      setValue(name, rows, { shouldDirty: true });
    },
    [matrixValue, name, setValue],
  );

  const getDirectionValue = useCallback(
    (i: number, j: number): 'i2j' | 'j2i' | 'none' => {
      const vIJ = getCellValue(i, j);
      const vJI = getCellValue(j, i);
      if (vIJ > 0 && vJI === 0) return 'i2j';
      if (vJI > 0 && vIJ === 0) return 'j2i';
      return 'none';
    },
    [getCellValue],
  );

  const dirFilledCount = useMemo(() => {
    let count = 0;
    for (const pair of allPairs) {
      if (getDirectionValue(pair.i, pair.j) !== 'none') count++;
    }
    return count;
  }, [allPairs, getDirectionValue]);

  const causalPairs = useMemo(() => {
    const result: Array<{ cause: number; effect: number }> = [];
    for (const pair of allPairs) {
      const dir = getDirectionValue(pair.i, pair.j);
      if (dir === 'i2j') result.push({ cause: pair.i, effect: pair.j });
      else if (dir === 'j2i') result.push({ cause: pair.j, effect: pair.i });
    }
    return result;
  }, [allPairs, getDirectionValue]);

  const strFilledCount = useMemo(() => {
    // "已填"按 cellValue >= 1 计数：1 弱 / 2 中 / 4 强 任何一档都算已填；
    // 强度档在数据里 0 表示未填。
    let count = 0;
    for (const cp of causalPairs) {
      if (getCellValue(cp.cause, cp.effect) >= 1) count++;
    }
    return count;
  }, [causalPairs, getCellValue]);

  if (n < 2) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        请先在"因素清单"阶段添加至少 2 个因素后，再进行关系矩阵填写。
      </div>
    );
  }

  const totalPairs = allPairs.length;
  const currentDirPair = allPairs[Math.min(dirPairIndex, totalPairs - 1)];

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
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-2">
        <StepTab
          label={`① 因果判定 (${dirFilledCount}/${totalPairs})`}
          active={step === 'direction'}
          onClick={() => setStep('direction')}
          disabled={disabled}
        />
        <span className="text-slate-300 text-xs">→</span>
        <StepTab
          label="② 得分结果"
          active={step === 'scores'}
          onClick={() => setStep('scores')}
          disabled={disabled}
        />
        <span className="text-slate-300 text-xs">→</span>
        <StepTab
          label={`③ 影响强度 (${strFilledCount}/${causalPairs.length})`}
          active={step === 'strength'}
          onClick={() => setStep('strength')}
          disabled={disabled || causalPairs.length === 0}
          dimmed={causalPairs.length === 0}
          optional
        />
      </div>

      {step === 'direction' && (
        <DirectionStep
          factorNames={factorNames}
          allPairs={allPairs}
          currentPairIndex={dirPairIndex}
          setCurrentPairIndex={setDirPairIndex}
          getDirectionValue={getDirectionValue}
          setDirectionPair={setDirectionPair}
          currentPair={currentDirPair}
          totalPairs={totalPairs}
          disabled={disabled}
          onComplete={() => setStep('scores')}
          dirFilledCount={dirFilledCount}
        />
      )}

      {step === 'scores' && (
        <ScoresStep
          causeScores={causeScores}
          hasCausalPairs={causalPairs.length > 0}
          onGoStrength={() => setStep('strength')}
        />
      )}

      {step === 'strength' && (
        <StrengthStep
          factorNames={factorNames}
          causalPairs={causalPairs}
          currentPairIndex={strPairIndex}
          setCurrentPairIndex={setStrPairIndex}
          getCellValue={getCellValue}
          setCellValue={setCellValue}
          disabled={disabled}
        />
      )}

      {field.hint && <p className="text-xs text-slate-400">{field.hint}</p>}
    </div>
  );
});

function StepTab({ label, active, onClick, disabled, dimmed, optional }: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  dimmed?: boolean;
  optional?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'rounded-md px-3 py-1.5 text-xs font-medium transition',
        active
          ? 'bg-brand-600 text-white shadow-sm'
          : dimmed
            ? 'text-slate-300 cursor-not-allowed'
            : 'text-text-secondary hover:bg-surface-100',
      )}
    >
      {label}
      {optional && !active && <span className="ml-1 text-[10px] text-slate-400">(可选)</span>}
    </button>
  );
}

interface DirectionStepProps {
  factorNames: string[];
  allPairs: CellPair[];
  currentPairIndex: number;
  setCurrentPairIndex: (idx: number) => void;
  getDirectionValue: (i: number, j: number) => 'i2j' | 'j2i' | 'none';
  setDirectionPair: (i: number, j: number, direction: 'i2j' | 'j2i' | 'none') => void;
  currentPair: CellPair;
  totalPairs: number;
  disabled?: boolean;
  onComplete: () => void;
  dirFilledCount: number;
}

function DirectionStep({
  factorNames,
  allPairs,
  currentPairIndex,
  setCurrentPairIndex,
  getDirectionValue,
  setDirectionPair,
  currentPair,
  totalPairs,
  disabled,
  onComplete,
  dirFilledCount,
}: DirectionStepProps) {
  const currentDir = getDirectionValue(currentPair.i, currentPair.j);
  const nameI = factorNames[currentPair.i];
  const nameJ = factorNames[currentPair.j];
  const shortI = nameI;
  const shortJ = nameJ;

  function handleSelect(dir: 'i2j' | 'j2i' | 'none') {
    setDirectionPair(currentPair.i, currentPair.j, dir);
    if (currentPairIndex < totalPairs - 1) {
      setCurrentPairIndex(currentPairIndex + 1);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
        逐组判断两个因素之间是否存在因果关系。选"A→B"表示 A 是因、B 是果；选"无关"表示两者之间没有因果关系。
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-2 text-xs text-slate-400">
          第 {currentPairIndex + 1} / {totalPairs} 组
        </div>
        <div className="mb-4 text-center space-y-1">
          <p className="text-sm font-semibold text-slate-800 leading-relaxed">
            「{nameI}」
          </p>
          <span className="text-slate-400">⟷</span>
          <p className="text-sm font-semibold text-slate-800 leading-relaxed">
            「{nameJ}」
          </p>
          <p className="mt-1 text-sm text-slate-500">这两个因素之间的因果关系是？</p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleSelect('i2j')}
            className={clsx(
              'w-full rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition text-left',
              currentDir === 'i2j'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-surface-200 text-text-secondary hover:border-emerald-300 hover:bg-emerald-50',
            )}
          >
            <span className="text-emerald-600 font-semibold">{shortI}</span>
            <span className="mx-1">→</span>
            <span className="text-blue-600 font-semibold">{shortJ}</span>
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleSelect('j2i')}
            className={clsx(
              'w-full rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition text-left',
              currentDir === 'j2i'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-surface-200 text-text-secondary hover:border-blue-300 hover:bg-blue-50',
            )}
          >
            <span className="text-blue-600 font-semibold">{shortJ}</span>
            <span className="mx-1">→</span>
            <span className="text-emerald-600 font-semibold">{shortI}</span>
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleSelect('none')}
            className={clsx(
              'w-full rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition text-left',
              currentDir === 'none'
                ? 'border-slate-500 bg-slate-100 text-slate-700'
                : 'border-surface-200 text-text-secondary hover:border-slate-300 hover:bg-slate-50',
            )}
          >
            无关
          </button>
        </div>

        <div className="mt-3 text-center text-xs text-slate-400">
          {currentDir === 'i2j' && <span>已选：<strong>{nameI}</strong> 是因，<strong>{nameJ}</strong> 是果</span>}
          {currentDir === 'j2i' && <span>已选：<strong>{nameJ}</strong> 是因，<strong>{nameI}</strong> 是果</span>}
          {currentDir === 'none' && <span>已选：两者无因果关系</span>}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            disabled={currentPairIndex === 0 || disabled}
            onClick={() => setCurrentPairIndex(currentPairIndex - 1)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
          >
            ← 上一组
          </button>
          <div className="flex gap-1">
            {allPairs.map((pair, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentPairIndex(idx)}
                className={clsx(
                  'h-2 w-2 rounded-full transition',
                  idx === currentPairIndex
                    ? 'bg-brand-500'
                    : getDirectionValue(pair.i, pair.j) !== 'none'
                      ? 'bg-emerald-300'
                      : 'bg-surface-200',
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
            下一组 →
          </button>
        </div>
      </div>

      {dirFilledCount > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onComplete}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
          >
            查看得分结果 →
          </button>
        </div>
      )}
    </div>
  );
}

interface ScoresStepProps {
  causeScores: CauseScoreItem[];
  hasCausalPairs: boolean;
  onGoStrength: () => void;
}

function ScoresStep({ causeScores, hasCausalPairs, onGoStrength }: ScoresStepProps) {
  const sorted = [...causeScores].sort((a, b) => a.score - b.score);

  if (sorted.length === 0 || sorted.every((s) => s.outCount === 0 && s.inCount === 0)) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        请先完成第一步因果判定，至少确认一组因果关系后自动计算得分。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
        因果方向得分 = 作为果次数 − 作为因次数。得分最低→根因（最源头），最高→表因（最表象），接近 0→过因（中间传导）。
      </div>
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
      <div className="rounded-md border border-brand-100 bg-brand-50 px-3 py-2 text-xs text-brand-700 space-y-0.5">
        <p>▸ <strong>根因</strong>（得分 &lt; −2）：影响其他因素多、被影响少 → 最源头的原因</p>
        <p>▸ <strong>过因</strong>（得分 −2~2）：既影响其他也被影响 → 中间传导因素</p>
        <p>▸ <strong>表因</strong>（得分 &gt; 2）：被影响多、影响其他少 → 最表面的现象</p>
      </div>

      {hasCausalPairs && (
        <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700 flex items-center justify-between">
          <span>如需进一步做 DEMATEL 中心度 + 帕累托分析，可对已确认的因果关系组填写影响强度。</span>
          <button
            type="button"
            onClick={onGoStrength}
            className="ml-3 shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
          >
            填写影响强度 →
          </button>
        </div>
      )}
    </div>
  );
}

interface StrengthStepProps {
  factorNames: string[];
  causalPairs: Array<{ cause: number; effect: number }>;
  currentPairIndex: number;
  setCurrentPairIndex: (idx: number) => void;
  getCellValue: (i: number, j: number) => number;
  setCellValue: (i: number, j: number, value: number) => void;
  disabled?: boolean;
}

function StrengthStep({
  factorNames,
  causalPairs,
  currentPairIndex,
  setCurrentPairIndex,
  getCellValue,
  setCellValue,
  disabled,
}: StrengthStepProps) {
  if (causalPairs.length === 0) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        没有需要填写影响强度的因果关系对。请回到第一步确认因果判定。
      </div>
    );
  }

  const safeIndex = Math.min(currentPairIndex, causalPairs.length - 1);
  const currentCP = causalPairs[safeIndex];
  const currentValue = getCellValue(currentCP.cause, currentCP.effect);
  const causeName = factorNames[currentCP.cause];
  const effectName = factorNames[currentCP.effect];

  function handleSelect(value: number) {
    setCellValue(currentCP.cause, currentCP.effect, value);
    if (safeIndex < causalPairs.length - 1) {
      setCurrentPairIndex(safeIndex + 1);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
        对已确认存在因果关系的 {causalPairs.length} 组，逐个填写影响强度（因在前 → 果在后）。强度用于 DEMATEL 中心度计算和帕累托 80/20 分析。
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-2 text-xs text-slate-400">
          第 {safeIndex + 1} / {causalPairs.length} 组
        </div>
        <div className="mb-4 text-center">
          <span className="inline-block rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 mr-1">因</span>
          <span className="text-base font-semibold text-slate-800">
            「{causeName}」
          </span>
          <span className="mx-2 text-slate-400">→</span>
          <span className="text-base font-semibold text-slate-800">
            「{effectName}」
          </span>
          <span className="inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 ml-1">果</span>
          <p className="mt-1 text-sm text-slate-500">「{causeName}」对「{effectName}」的影响强度是？</p>
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
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-surface-200 text-text-secondary hover:border-brand-300 hover:bg-brand-50',
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
            disabled={safeIndex === 0 || disabled}
            onClick={() => setCurrentPairIndex(safeIndex - 1)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
          >
            ← 上一组
          </button>
          <div className="flex gap-1">
            {causalPairs.map((cp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentPairIndex(idx)}
                className={clsx(
                  'h-2 w-2 rounded-full transition',
                  idx === safeIndex
                    ? 'bg-brand-500'
                    : getCellValue(cp.cause, cp.effect) >= 2
                      ? 'bg-brand-200'
                      : 'bg-surface-200',
                )}
                style={{ display: causalPairs.length > 50 ? 'none' : undefined }}
              />
            ))}
          </div>
          <button
            type="button"
            disabled={safeIndex >= causalPairs.length - 1 || disabled}
            onClick={() => setCurrentPairIndex(safeIndex + 1)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
          >
            下一组 →
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-3">
        <p className="mb-2 text-xs font-medium text-slate-500">已确认的因果关系（因→果）：</p>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
              <th className="px-2 py-1">因</th>
              <th className="px-2 py-1 text-center">→</th>
              <th className="px-2 py-1">果</th>
              <th className="px-2 py-1 text-center">强度</th>
            </tr>
          </thead>
          <tbody>
            {causalPairs.map((cp, idx) => {
              const strength = getCellValue(cp.cause, cp.effect);
              return (
                <tr
                  key={idx}
                  className={clsx(
                    'border-b border-slate-50 cursor-pointer transition',
                    idx === safeIndex && 'bg-brand-50',
                  )}
                  onClick={() => setCurrentPairIndex(idx)}
                >
                  <td className="px-2 py-1 font-medium text-slate-700">{factorNames[cp.cause]}</td>
                  <td className="px-2 py-1 text-center text-slate-400">→</td>
                  <td className="px-2 py-1 font-medium text-slate-700">{factorNames[cp.effect]}</td>
                  <td className="px-2 py-1 text-center">
                    {strength >= 1 ? (
                      <span className={clsx(
                        'inline-block rounded px-1.5 py-0.5 text-xs font-medium',
                        strength >= 4 ? 'bg-rose-100 text-rose-700' : strength >= 2 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600',
                      )}>
                        {strength}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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

function roleColor(role: string) {
  if (role === '根因') return 'bg-rose-100 text-rose-700 border-rose-200';
  if (role === '表因') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}
