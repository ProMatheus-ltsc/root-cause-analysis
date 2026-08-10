/**
 * 根因类型分布饼图：基于 utils/dashboard.rootCauseTypeDistribution 的结果渲染 recharts 饼图。
 */
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { RootCauseTypeCount } from '../../utils/dashboard';

const COLORS = ['#0ea5e9', '#14b8a6', '#f59e0b', '#8b5cf6', '#f43f5e', '#84cc16', '#6366f1', '#64748b'];

export function RootCauseTypePie({ data }: { data: RootCauseTypeCount[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">暂无根因类型数据</p>;
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={2}>
            {data.map((entry, idx) => (
              <Cell key={entry.type} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
