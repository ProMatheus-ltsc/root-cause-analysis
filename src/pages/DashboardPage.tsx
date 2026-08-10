/**
 * 仪表盘首页：提供带使用场景提示和分析流程概览的模板选择入口、数据备份提醒，并展示统计看板。
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import type { FormTemplate } from '../types';
import { useRecords } from '../hooks/useDB';
import { getSetting } from '../services/db';
import { daysSinceLastExport } from '../utils/dashboard';
import { TEMPLATE_LIST, TEMPLATES } from '../templates';
import { TEMPLATE_COLORS } from '../constants/templateMeta';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';

const BACKUP_REMINDER_THRESHOLD_DAYS = 30;

function TemplateCard({ template }: { template: FormTemplate }) {
  const [expanded, setExpanded] = useState(false);
  const colorClass = TEMPLATE_COLORS[template.id];

  return (
    <div className={`rounded-lg border ${colorClass} overflow-hidden transition-all`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 p-3 text-left text-sm font-medium"
      >
        <span className="text-2xl">{template.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{template.name}</div>
          <div className="mt-0.5 text-xs opacity-75">{template.description}</div>
        </div>
        <span className="shrink-0 text-xs opacity-50">{expanded ? '收起' : '展开'}</span>
      </button>
      {expanded && (
        <div className="border-t border-current/10 px-3 pb-3 pt-2 text-xs leading-relaxed">
          {template.scenarios && template.scenarios.length > 0 && (
            <div className="mb-2">
              <p className="mb-1 font-semibold">适用场景</p>
              <ul className="list-inside list-disc space-y-0.5 opacity-80">
                {template.scenarios.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {template.flowSteps && template.flowSteps.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 font-semibold">分析流程</p>
              <ol className="list-inside list-decimal space-y-0.5 opacity-80">
                {template.flowSteps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </div>
          )}
          <Link
            to={`/form/${template.id}`}
            className="inline-block rounded-md bg-current/10 px-3 py-1.5 font-medium transition hover:bg-current/20"
          >
            开始分析
          </Link>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { records, loading } = useRecords();
  const [lastExportedAt, setLastExportedAt] = useState<string | undefined>(undefined);

  useEffect(() => {
    getSetting<string | undefined>('lastExportedAt', undefined).then(setLastExportedAt);
  }, []);

  const daysSince = daysSinceLastExport(lastExportedAt, format(new Date(), 'yyyy-MM-dd'));
  const showBackupReminder = records.length > 0 && (daysSince === undefined || daysSince > BACKUP_REMINDER_THRESHOLD_DAYS);

  return (
    <div className="space-y-8">
      {showBackupReminder && (
        <div className="rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          {daysSince === undefined ? '还没有导出过数据备份，' : `已 ${daysSince} 天未备份数据，`}
          建议前往
          <Link to="/data" className="mx-1 font-medium underline">
            数据管理
          </Link>
          导出一份 JSON 备份，避免清除浏览器数据或换设备时丢失历史记录。
        </div>
      )}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">选择分析方法</h2>
        <p className="mb-4 text-sm text-slate-500">展开卡片查看适用场景与分析流程，选择最适合当前问题的方法</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATE_LIST.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      </section>
      {loading ? (
        <p className="text-sm text-slate-400">加载中…</p>
      ) : (
        <DashboardLayout records={records} templates={TEMPLATES} />
      )}
    </div>
  );
}

