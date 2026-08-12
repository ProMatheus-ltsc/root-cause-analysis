import { useMemo } from 'react';
import clsx from 'clsx';

interface MatrixHeatMapProps {
  factorNames: string[];
  matrix: number[][];
}

function getHeatColor(value: number, max: number): string {
  if (value === 0) return '';
  const ratio = Math.min(value / Math.max(max, 1), 1);
  if (ratio < 0.25) return 'bg-brand-50 text-brand-600';
  if (ratio < 0.5) return 'bg-brand-100 text-brand-700';
  if (ratio < 0.75) return 'bg-brand-200 text-brand-800';
  return 'bg-brand-300 text-brand-900 font-semibold';
}

export function MatrixHeatmap({ factorNames, matrix }: MatrixHeatMapProps) {
  const maxVal = useMemo(() => {
    let m = 0;
    for (const row of matrix) {
      for (const v of row) {
        if (v > m) m = v;
      }
    }
    return m;
  }, [matrix]);

  const n = factorNames.length;

  if (n === 0) {
    return (
      <div className="rounded-xl border border-surface-200 bg-surface-50 p-8 text-center text-sm text-text-tertiary">
        添加因素并填写矩阵后，此处将显示热力图
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-surface-200 p-4" role="img" aria-label="因果矩阵热力图">
      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-surface-0 px-2 py-2 text-left font-medium text-text-tertiary text-[10px] align-bottom">
              行↓ \ 列→
            </th>
            {factorNames.map((fname, j) => (
              <th
                key={j}
                title={fname}
                className="min-w-[160px] max-w-[200px] px-2 py-2 text-center font-medium text-text-secondary align-bottom"
              >
                <div className="break-words leading-tight whitespace-pre-wrap">{fname}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {factorNames.map((rowName, i) => (
            <tr key={i}>
              <td
                title={rowName}
                className="sticky left-0 z-10 bg-surface-0 px-2 py-2 text-left font-medium text-text-secondary align-middle min-w-[140px] max-w-[200px]"
              >
                <div className="break-words leading-tight whitespace-pre-wrap">{rowName}</div>
              </td>
              {factorNames.map((_, j) => {
                if (i === j) {
                  return (
                    <td key={j} className="border border-surface-100 bg-surface-50 px-1 py-2 text-center text-surface-300 text-[10px] align-middle">
                      —
                    </td>
                  );
                }
                const val = matrix[i]?.[j] ?? 0;
                return (
                  <td
                    key={j}
                    className={clsx(
                      'min-w-[48px] border border-surface-100 px-1 py-2 text-center text-[12px] transition-colors align-middle tabular-nums',
                      getHeatColor(val, maxVal),
                      !val && 'text-text-tertiary',
                    )}
                    title={`${rowName} → ${factorNames[j]}: ${val}`}
                  >
                    {val || '·'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-text-tertiary">
        <span>弱</span>
        <div className="flex gap-0.5">
          <span className="inline-block h-3 w-6 rounded-sm bg-brand-50" />
          <span className="inline-block h-3 w-6 rounded-sm bg-brand-100" />
          <span className="inline-block h-3 w-6 rounded-sm bg-brand-200" />
          <span className="inline-block h-3 w-6 rounded-sm bg-brand-300" />
        </div>
        <span>强</span>
      </div>
    </div>
  );
}