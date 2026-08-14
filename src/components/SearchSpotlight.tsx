import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProblemStore } from '../stores/problemStore';
import { useRecordStore } from '../stores/recordStore';
import { TEMPLATES } from '../templates';
import type { TemplateId } from '../types';

interface SearchResult {
  id: string;
  type: 'problem' | 'record';
  title: string;
  subtitle: string;
  icon: string;
  href: string;
}

export function SearchSpotlight({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const problems = useProblemStore((s) => s.problems);
  const records = useRecordStore((s) => s.records);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const items: SearchResult[] = [];

    for (const p of problems) {
      if (p.title.toLowerCase().includes(q) || (p.problemStatement || '').toLowerCase().includes(q)) {
        items.push({
          id: p.id,
          type: 'problem',
          title: p.title,
          subtitle: p.problemStatement || '无描述',
          icon: '📋',
          href: `/problem/${p.id}`,
        });
      }
    }

    for (const r of records) {
      const tpl = TEMPLATES[r.templateId as TemplateId];
      const tplName = tpl?.title || r.templateId;
      if (r.title.toLowerCase().includes(q) || tplName.toLowerCase().includes(q)) {
        const problemTitle = problems.find((p) => p.id === r.problemId)?.title;
        items.push({
          id: r.id,
          type: 'record',
          title: `[${tplName}] ${r.title}`,
          subtitle: problemTitle ? `问题：${problemTitle}` : r.status === 'completed' ? '已完成' : '草稿',
          icon: tpl?.icon || '📄',
          href: r.problemId
            ? `/analysis/${r.problemId}/${r.templateId}/${r.id}`
            : `/form/${r.templateId}/${r.id}`,
        });
      }
    }

    return items.slice(0, 20);
  }, [query, problems, records]);

  useEffect(() => {
    setActiveIndex(0);
  }, [results]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      onClose();
      navigate(result.href);
    },
    [navigate, onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && results[activeIndex]) {
        e.preventDefault();
        handleSelect(results[activeIndex]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [results, activeIndex, handleSelect, onClose],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-xl border border-surface-200 bg-surface-0 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-surface-200 px-4 py-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索问题或分析记录…"
            className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
          />
          <kbd className="rounded border border-surface-200 bg-surface-50 px-1.5 py-0.5 text-[10px] text-text-tertiary">ESC</kbd>
        </div>

        {query.trim() && (
          <div className="max-h-80 overflow-y-auto p-2">
            {results.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-text-tertiary">未找到匹配结果</p>
            ) : (
              <ul>
                {results.map((r, i) => (
                  <li
                    key={r.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                      i === activeIndex ? 'bg-brand-50 text-brand-700' : 'text-text-primary hover:bg-surface-50'
                    }`}
                    onClick={() => handleSelect(r)}
                    onMouseEnter={() => setActiveIndex(i)}
                  >
                    <span className="text-base">{r.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{r.title}</p>
                      <p className="truncate text-xs text-text-tertiary">{r.subtitle}</p>
                    </div>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${r.type === 'problem' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                      {r.type === 'problem' ? '问题' : '分析'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!query.trim() && (
          <div className="px-4 py-6 text-center text-sm text-text-tertiary">
            输入关键词搜索问题标题、描述或分析记录
          </div>
        )}
      </div>
    </div>
  );
}
