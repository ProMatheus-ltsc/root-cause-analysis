/**
 * 仪表盘统计卡片：展示单个指标的标签、数值与可选提示。
 */
interface StatCardProps {
  label: string;
  value: number | string;
  hint?: string;
  accentClassName?: string;
}

export function StatCard({ label, value, hint, accentClassName }: StatCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accentClassName ?? 'text-slate-900'}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
