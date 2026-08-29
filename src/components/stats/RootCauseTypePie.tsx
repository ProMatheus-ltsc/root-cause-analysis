/**
 * 根因类型分布饼图：基于 utils/dashboard.rootCauseTypeDistribution 的结果渲染 recharts 饼图。
 * 环形（donut）样式，颜色按顺序循环取自 COLORS。
 */
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ResponsiveChart } from '@shared/core';
import type { RootCauseTypeCount } from '../../utils/dashboard';

/** 饼图配色盘：按数据顺序循环取色，保证每个类型都有不同颜色 */
const COLORS = ['#0ea5e9', '#14b8a6', '#f59e0b', '#8b5cf6', '#f43f5e', '#84cc16', '#6366f1', '#64748b'];

/**
 * 根因类型分布饼图组件。
 * @param data 各根因类型的计数列表（label 用于名称、count 用于扇区大小），空数组时显示占位文案
 */
export function RootCauseTypePie({ data }: { data: RootCauseTypeCount[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">暂无根因类型数据</p>;
  }
  const total = data.reduce((sum, d) => sum + d.count, 0);
  return (
    <ResponsiveChart minHeight="12rem" maxHeight="16rem">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="label"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={data.length > 1 ? 2 : 0}
            label={({ name, value }) => `${name} (${value})`}
            labelLine={data.length > 1}
          >
            {data.map((entry, idx) => (
              <Cell key={entry.type} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value} 条 (${Math.round((Number(value) / total) * 100)}%)`, '数量']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ResponsiveChart>
  );
}
