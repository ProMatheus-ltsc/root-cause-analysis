/**
 * 仪表盘布局：组合状态统计卡片、根因类型分布、高频经验教训、待跟进提醒与最近记录。
 * 数据全部来自本地 IndexedDB 的分析记录（records），由 utils/dashboard 的纯函数派生，
 * 本组件只负责排版与展示，不做任何数据加工。
 */
import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import type { FormRecord, FormTemplate, TemplateId } from '../../types';
import {
  countByDisplayStatus,
  extractTopKeywords,
  recentRecords,
  rootCauseTypeDistribution,
} from '../../utils/dashboard';
import { StatCard } from '../stats/StatCard';
import { KeywordList } from '../stats/KeywordList';
import { RecordRow } from '../stats/RecordRow';

// 根因类型饼图体积较大（recharts），用 React.lazy 按需加载 + Suspense 兜底，加快首屏渲染
const RootCauseTypePie = lazy(() =>
  import('../stats/RootCauseTypePie').then((m) => ({ default: m.RootCauseTypePie }))
);

interface DashboardLayoutProps {
  records: FormRecord[];
  templates: Record<TemplateId, FormTemplate>;
}

/**
 * 仪表盘主组件。
 * @param records 全部分析记录（来自 IndexedDB）
 * @param templates 模板字典（TemplateId → 模板定义），用于按记录 templateId 取图标/名称
 */
export function DashboardLayout({ records, templates }: DashboardLayoutProps) {
  const todayISO = format(new Date(), 'yyyy-MM-dd');
  const statusCounts = countByDisplayStatus(records, templates, todayISO);
  const rootCauseDist = rootCauseTypeDistribution(records);
  const keywords = extractTopKeywords(records, 12);
  const recent = recentRecords(records, 5);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="待分析" value={statusCounts.待分析} />
        <StatCard label="分析中" value={statusCounts.分析中} />
        <StatCard label="已完成" value={statusCounts.已完成} accentClassName="text-emerald-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="根因类型分布">
          <Suspense fallback={<div className="flex h-48 items-center justify-center text-sm text-slate-400">加载图表中…</div>}>
            <RootCauseTypePie data={rootCauseDist} />
          </Suspense>
        </Panel>
        <Panel title="高频经验教训">
          <KeywordList keywords={keywords} />
        </Panel>
      </div>

      <Panel
        title="最近分析记录"
        action={
          <Link to="/history" className="text-sm text-sky-600 hover:underline">
            查看全部
          </Link>
        }
      >
        {recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">还没有分析记录，去新建一条吧</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {recent.map((r) => (
              <RecordRow key={r.id} record={r} template={templates[r.templateId]} rightText={r.updatedAt.slice(0, 10)} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

/** 通用面板容器：统一卡片样式，可选右上角操作区（action），内容由 children 填充。 */
function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-surface-200 bg-surface-0 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-text-primary">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
