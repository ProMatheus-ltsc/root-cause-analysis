/**
 * 仪表盘首页（以问题为导向）：问题列表入口 + 数据备份提醒 + 统计看板。
 * 新建问题 → /new；问题详情（含挂分析方法）→ /problem/:id。
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useProblems, useRecords } from '../hooks/useDB';
import { useSearchProblems } from '../hooks/useSearch';
import { getSetting } from '../services/db';
import { daysSinceLastExport } from '../utils/dashboard';
import { TEMPLATES } from '../templates';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';

const BACKUP_REMINDER_THRESHOLD_DAYS = 30;

export default function DashboardPage() {
  const { problems, loading } = useProblems();
  const { records } = useRecords();
  const [lastExportedAt, setLastExportedAt] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    getSetting<string | undefined>('lastExportedAt', undefined).then(setLastExportedAt);
  }, []);

  const filteredProblems = useSearchProblems(problems, searchQuery);

  const daysSince = daysSinceLastExport(lastExportedAt, format(new Date(), 'yyyy-MM-dd'));
  const showBackupReminder = records.length > 0 && (daysSince === undefined || daysSince > BACKUP_REMINDER_THRESHOLD_DAYS);

  return (
    <div className="space-y-8 animate-fade-in">
      {showBackupReminder && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 px-5 py-3.5 text-sm text-brand-800">
          {daysSince === undefined ? '还没有导出过数据备份，' : `已 ${daysSince} 天未备份数据，`}
          建议前往
          <Link to="/data" className="mx-1 font-semibold underline decoration-brand-300">
            数据管理
          </Link>
          导出一份 JSON 备份，避免清除浏览器数据或换设备时丢失历史记录。
        </div>
      )}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-text-primary">问题库（{filteredProblems.length}）</h2>
          <Link
            to="/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-brand-200 hover:bg-brand-700 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            新建问题
          </Link>
        </div>
        <div className="mb-5">
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" /></svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索问题标题或描述…"
              className="w-full rounded-xl border border-surface-200 bg-surface-0 py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 transition"
              aria-label="搜索问题"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                aria-label="清除搜索"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        </div>
        {loading ? (
          <p className="text-sm text-text-tertiary">加载中…</p>
        ) : filteredProblems.length === 0 ? (
          searchQuery ? (
            <div className="rounded-2xl border-2 border-dashed border-surface-300 py-12 text-center text-sm text-text-tertiary">
              未找到匹配"{searchQuery}"的问题
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-surface-300 py-16 text-center text-sm text-text-tertiary">
              还没有问题，点击"新建问题"开始第一次根因分析
            </div>
          )
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProblems.map((problem) => {
              const count = records.filter((r) => r.problemId === problem.id).length;
              return (
                <Link
                  key={problem.id}
                  to={`/problem/${problem.id}`}
                  className="group rounded-xl border border-surface-200 bg-surface-0 p-5 transition hover:border-brand-300 hover:shadow-md hover:shadow-brand-100"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-text-primary group-hover:text-brand-700 transition-colors">{problem.title}</p>
                    <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">{count} 个分析</span>
                  </div>
                  {problem.problemStatement && (
                    <p className="mt-2.5 line-clamp-2 text-xs text-text-secondary leading-relaxed">{problem.problemStatement}</p>
                  )}
                  <p className="mt-3.5 text-xs text-text-tertiary">更新于 {problem.updatedAt.slice(0, 10)}</p>
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
