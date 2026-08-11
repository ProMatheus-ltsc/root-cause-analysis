/**
 * 仪表盘布局：组合状态统计卡片、根因类型分布、高频经验教训、待跟进提醒与最近记录。
 */
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
import { RootCauseTypePie } from '../stats/RootCauseTypePie';
import { KeywordList } from '../stats/KeywordList';
import { RecordRow } from '../stats/RecordRow';

interface DashboardLayoutProps {
  records: FormRecord[];
  templates: Record<TemplateId, FormTemplate>;
}

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
          <RootCauseTypePie data={rootCauseDist} />
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

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
