/**
 * 历史记录页（/history）：按模板/严重程度/根因类型/对策状态/时间范围筛选 + 全文搜索，支持单条/批量导出
 * Markdown 与删除，客户端分页避免记录多了列表过长。打印/导出 PDF 在记录详情页（FormPage）内进行。
 * 交互流程：全文搜索（300ms 防抖）→ 多条件筛选（useMemo 缓存结果）→ 按更新时间倒序 →
 *   分页展示 → 单条导出 / 批量导出 Markdown / 删除（二次确认）。
 * 核心概念：防抖（debounce）避免每敲一个字符都立刻搜索；派生数据用 useMemo 缓存，
 *   避免筛选条件没变时每次渲染都重复计算。
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

/** 每页展示的记录条数（客户端分页） */
const PAGE_SIZE = 20;

/** 时间范围筛选项：value 为"最近 N 天"的天数，空字符串表示全部时间 */
const DATE_RANGE_OPTIONS = [
  { value: '', label: '全部时间' },
  { value: '7', label: '最近 7 天' },
  { value: '30', label: '最近 30 天' },
  { value: '90', label: '最近 90 天' },
];

/** 判断 createdAt 是否落在最近 days 天内：先把日期字符串解析成 Date，再比较"日历天数差"（只看日期不看时分秒）。 */
function isWithinRecentDays(createdAt: string, todayISO: string, days: number): boolean {
  return differenceInCalendarDays(parseISO(todayISO), parseISO(createdAt.slice(0, 10))) <= days;
}

/** 把 Markdown 文本下载为本地文件：Blob + 临时 URL + 模拟点击 <a download> 的标准做法。 */
function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 历史记录页组件：全文搜索 + 多条件筛选 + 分页展示全部分析记录，支持导出 Markdown 与删除。
 * props：无（路由页面，由 Router 直接渲染）。
 */
export default function HistoryPage() {
  const { records, loading } = useRecords();
  const deleteRecord = useDeleteRecord();
  const { showToast } = useToast();
  // query：输入框的实时内容；debouncedQuery：防抖后的搜索词（真正用于搜索，300ms 无输入才更新）
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  // 以下四种筛选条件：模板 / 严重程度 / 根因类型 / 时间范围
  const [templateFilter, setTemplateFilter] = useState<TemplateId | ''>('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [rootCauseFilter, setRootCauseFilter] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState('');
  // page：当前页码；searchInputRef：搜索框引用，供快捷键 ⌘K 聚焦
  const [page, setPage] = useState(1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 防抖搜索：用户停止输入 300ms 后才更新 debouncedQuery，
  // 否则每次按键都会触发一遍全文搜索/过滤，输入快时会造成大量无意义计算
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // 全局快捷键：按 ⌘K 或 Ctrl+K 时聚焦搜索框（阻止浏览器默认的"打开地址栏"行为）
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

  // searched：第一步，先按防抖后的关键词做全文搜索
  const searched = useSearchRecords(records, debouncedQuery);
  // filtered：第二步，在搜索结果上叠加模板/严重程度/根因类型/时间范围筛选。
  // useMemo 缓存计算结果：只有依赖项变化才重算，依赖没变时直接复用上一次结果，避免重复计算
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

  // sorted：按更新时间倒序排列（复制数组再排序，避免修改原数组；ISO 时间字符串直接 localeCompare 就是字典序）
  const sorted = useMemo(() => [...filtered].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [filtered]);

  // 任一筛选条件或搜索词变化时，把页码重置回第 1 页（否则可能停留在超出新结果范围的页）
  useEffect(() => {
    setPage(1);
  }, [query, templateFilter, severityFilter, rootCauseFilter, dateRangeFilter]);

  // 客户端分页：totalPages 至少为 1；currentPage 防止页码越界；pageItems 截取当前页要展示的数据
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  /** 删除单条记录：confirm 二次确认后调用 deleteRecord（异步写入 IndexedDB）。 */
  async function handleDelete(id: string) {
    if (!confirm('确定删除这条记录吗？此操作不可撤销。')) return;
    await deleteRecord(id);
    showToast('已删除', 'success');
  }

  /** 导出单条记录为 Markdown 文件：根据记录所属模板渲染成 Markdown 文本后下载。 */
  function handleExportMarkdown(record: FormRecord) {
    const template = getTemplate(record.templateId);
    const markdown = exportRecordToMarkdown(template, record);
    downloadMarkdown(`${record.title || template.name}.md`, markdown);
  }

  /** 批量导出：把当前筛选/排序后的全部记录合并导出一个 Markdown 文件。 */
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

      {(templateFilter || severityFilter || rootCauseFilter || dateRangeFilter) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400">已筛选：</span>
          {templateFilter && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs text-sky-700">
              {ALL_TEMPLATE_LIST.find((t) => t.id === templateFilter)?.name || templateFilter}
              <button type="button" onClick={() => setTemplateFilter('')} className="ml-0.5 text-sky-400 hover:text-sky-700">×</button>
            </span>
          )}
          {severityFilter && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs text-amber-700">
              {SEVERITY_OPTIONS.find((o) => o.value === severityFilter)?.label || severityFilter}
              <button type="button" onClick={() => setSeverityFilter('')} className="ml-0.5 text-amber-400 hover:text-amber-700">×</button>
            </span>
          )}
          {rootCauseFilter && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs text-violet-700">
              {ROOT_CAUSE_TYPE_OPTIONS.find((o) => o.value === rootCauseFilter)?.label || rootCauseFilter}
              <button type="button" onClick={() => setRootCauseFilter('')} className="ml-0.5 text-violet-400 hover:text-violet-700">×</button>
            </span>
          )}
          {dateRangeFilter && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs text-emerald-700">
              {DATE_RANGE_OPTIONS.find((o) => o.value === dateRangeFilter)?.label || dateRangeFilter}
              <button type="button" onClick={() => setDateRangeFilter('')} className="ml-0.5 text-emerald-400 hover:text-emerald-700">×</button>
            </span>
          )}
          <button
            type="button"
            onClick={() => { setTemplateFilter(''); setSeverityFilter(''); setRootCauseFilter(''); setDateRangeFilter(''); }}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            清除全部
          </button>
        </div>
      )}

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
