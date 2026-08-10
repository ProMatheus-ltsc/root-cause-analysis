/**
 * 仪表盘首页（以问题为导向）：问题列表入口 + 数据备份提醒 + 统计看板。
 * 新建问题 → /new；问题详情（含挂分析方法）→ /problem/:id。
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useProblems, useRecords } from '../hooks/useDB';
import { getSetting } from '../services/db';
import { daysSinceLastExport } from '../utils/dashboard';
import { TEMPLATES } from '../templates';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';

const BACKUP_REMINDER_THRESHOLD_DAYS = 30;

export default function DashboardPage() {
  const { problems, loading } = useProblems();
  const { records } = useRecords();
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
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">问题库（{problems.length}）</h2>
          <Link
            to="/new"
            className="inline-block rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            + 新建问题
          </Link>
        </div>
        <p className="mb-4 text-sm text-slate-500">以问题为导向：先定义问题，再在问题下挂一个或多个根因分析方法</p>
        {loading ? (
          <p className="text-sm text-slate-400">加载中…</p>
        ) : problems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 py-12 text-center text-sm text-slate-400">
            还没有问题，点击"新建问题"开始第一次根因分析
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {problems.map((problem) => {
              const count = records.filter((r) => r.problemId === problem.id).length;
              return (
                <Link
                  key={problem.id}
                  to={`/problem/${problem.id}`}
                  className="rounded-lg border border-slate-200 bg-white p-4 transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-slate-800">{problem.title}</p>
                    <span className="shrink-0 rounded bg-sky-50 px-2 py-0.5 text-xs text-sky-700">{count} 个分析</span>
                  </div>
                  {problem.problemStatement && (
                    <p className="mt-2 line-clamp-2 text-xs text-slate-500">{problem.problemStatement}</p>
                  )}
                  <p className="mt-3 text-xs text-slate-400">更新于 {problem.updatedAt.slice(0, 10)}</p>
                </Link>
              );
            })}
          </div>
        )}
      </section>
      <DashboardLayout records={records} templates={TEMPLATES} />
    </div>
  );
}
