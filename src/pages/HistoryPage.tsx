/**
 * 历史记录页：按模板/严重程度/根因类型/对策状态/时间范围筛选 + 全文搜索，支持单条/批量导出
 * Markdown 与删除，客户端分页避免记录多了列表过长。打印/导出 PDF 在记录详情页（FormPage）内进行。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { useDeleteRecord, useRecords, useSearchRecords } from '../hooks/useDB';
import { TEMPLATES, ALL_TEMPLATE_LIST, getTemplate } from '../templates';
import { TEMPLATE_COLORS } from '../constants/templateMeta';
import { ROOT_CAUSE_TYPE_OPTIONS, SEVERITY_OPTIONS } from '../templates/shared';
import { exportRecordToMarkdown, exportRecordsToMarkdown } from '../services/exportMarkdown';
import { useToast } from '../hooks/useToast';
import type { FormRecord, TemplateId } from '../types';

const PAGE_SIZE = 20;

const DATE_RANGE_OPTIONS = [
  { value: '', label: '全部时间' },
  { value: '7', label: '最近 7 天' },
  { value: '30', label: '最近 30 天' },
  { value: '90', label: '最近 90 天' },
];

function isWithinRecentDays(createdAt: string, todayISO: string, days: number): boolean {
  return differenceInCalendarDays(parseISO(todayISO), parseISO(createdAt.slice(0, 10))) <= days;
}

function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function HistoryPage() {
  const { records, loading } = useRecords();
  const deleteRecord = useDeleteRecord();
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [templateFilter, setTemplateFilter] = useState<TemplateId | ''>('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [rootCauseFilter, setRootCauseFilter] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState('');
  const [page, setPage] = useState(1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const searched = useSearchRecords(records, debouncedQuery);
  const filtered = useMemo(() => {
    const todayISO = new Date().toISOString().slice(0, 10);
    return searched.filter((r) => {
      if (templateFilter && r.templateId !== templateFilter) return false;
      if (severityFilter && r.data['severity'] !== severityFilter) return false;
      if (rootCauseFilter && r.data['rootCauseType'] !== rootCauseFilter) return false;
      if (dateRangeFilter && !isWithinRecentDays(r.createdAt, todayISO, Number(dateRangeFilter))) return false;
      return true;
    });
  }, [searched, templateFilter, severityFilter, rootCauseFilter, dateRangeFilter]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [filtered]);

  useEffect(() => {
    setPage(1);
  }, [query, templateFilter, severityFilter, rootCauseFilter, dateRangeFilter]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  async function handleDelete(id: string) {
    if (!confirm('确定删除这条记录吗？此操作不可撤销。')) return;
    await deleteRecord(id);
    showToast('已删除', 'success');
  }

  function handleExportMarkdown(record: FormRecord) {
    const template = getTemplate(record.templateId);
    const markdown = exportRecordToMarkdown(template, record);
    downloadMarkdown(`${record.title || template.name}.md`, markdown);
  }

  function handleExportAll() {
    if (sorted.length === 0) {
      showToast('当前没有可导出的记录', 'error');
      return;
    }
    const markdown = exportRecordsToMarkdown(TEMPLATES, sorted);
    downloadMarkdown(`rca-history-${new Date().toISOString().slice(0, 10)}.md`, markdown);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">历史记录</h2>
        <button onClick={handleExportAll} className="text-sm text-sky-600 hover:underline">
          导出当前列表（Markdown）
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          className="min-w-[200px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="全文搜索标题与内容… (⌘K)"
          ref={searchInputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={templateFilter}
          onChange={(e) => setTemplateFilter(e.target.value as TemplateId | '')}
        >
          <option value="">全部模板</option>
          {ALL_TEMPLATE_LIST.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
          <option value="">全部严重程度</option>
          {SEVERITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={rootCauseFilter}
          onChange={(e) => setRootCauseFilter(e.target.value)}
        >
          <option value="">全部根因类型</option>
          {ROOT_CAUSE_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={dateRangeFilter}
          onChange={(e) => setDateRangeFilter(e.target.value)}
        >
          {DATE_RANGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">加载中…</p>
      ) : sorted.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">没有匹配的记录</p>
      ) : (
        <>
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {pageItems.map((record) => {
              const template = TEMPLATES[record.templateId];
              return (
                <div key={record.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <Link
                    to={record.problemId ? `/analysis/${record.problemId}/${record.templateId}/${record.id}` : `/analysis/unknown/${record.templateId}/${record.id}`}
                    className="min-w-0 flex-1"
                  >
                    <span className={`mr-2 rounded border px-2 py-0.5 text-xs ${TEMPLATE_COLORS[record.templateId]}`}>{template.name}</span>
                    <span className="text-sm font-medium text-slate-800">{record.title}</span>
                    <span className="ml-2 text-xs text-slate-400">更新于 {record.updatedAt.slice(0, 10)}</span>
                  </Link>
                  <div className="flex shrink-0 items-center gap-3 text-xs">
                    <button onClick={() => handleExportMarkdown(record)} className="text-sky-600 hover:underline">
                      导出 Markdown
                    </button>
                    <button onClick={() => handleDelete(record.id)} className="text-rose-600 hover:underline">
                      删除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 text-sm text-slate-500">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-40"
              >
                上一页
              </button>
              <span>
                第 {currentPage} / {totalPages} 页，共 {sorted.length} 条
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-40"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
