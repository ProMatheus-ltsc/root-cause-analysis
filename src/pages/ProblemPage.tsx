/**
 * 问题详情页（/problem/:problemId）：以问题为导向。
 * 展示问题摘要 + 该问题下的所有根因分析记录，可添加新的分析方法（同一问题挂多个分析）。
 */
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { TEMPLATE_LIST } from '../templates';
import type { TemplateId } from '../types';
import { useProblem, useRecordsByProblem, useSaveRecord } from '../hooks/useDB';
import { useToast } from '../hooks/useToast';
import { ProblemSummaryCard } from '../components/ProblemSummaryCard';
import { TEMPLATE_COLORS } from '../constants/templateMeta';

export default function ProblemPage() {
  const { problemId } = useParams<{ problemId: string }>();
  const navigate = useNavigate();
  const saveRecord = useSaveRecord();
  const { showToast } = useToast();
  const { problem, loading } = useProblem(problemId);
  const { records, loading: recordsLoading } = useRecordsByProblem(problemId);
  const [adding, setAdding] = useState(false);

  async function handleAddAnalysis(templateId: TemplateId) {
    if (!problem) return;
    const saved = await saveRecord({
      templateId,
      problemId: problem.id,
      title: problem.title,
      data: {},
      status: 'draft',
    });
    navigate(`/analysis/${problem.id}/${templateId}/${saved.id}`);
  }

  function handleDeleteAnalysis() {
    // 删除入口保留在历史记录页，此处给出提示避免误删
    showToast('请在历史记录页删除分析', 'error');
  }

  if (loading) return <p className="text-sm text-slate-400">加载中…</p>;
  if (!problem) return <p className="text-sm text-rose-600">问题不存在</p>;

  return (
    <div className="space-y-6">
      <div className="no-print flex items-center justify-between">
        <Link to="/" className="text-sm text-sky-600 hover:underline">
          ← 返回问题列表
        </Link>
      </div>
      <ProblemSummaryCard problem={problem} />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">根因分析（{records.length}）</h3>
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
          >
            {adding ? '取消' : '+ 添加分析方法'}
          </button>
        </div>

        {adding && (
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLATE_LIST.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleAddAnalysis(template.id)}
                className={`rounded-lg border ${TEMPLATE_COLORS[template.id]} p-3 text-left transition hover:shadow-md`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{template.icon}</span>
                  <span className="text-sm font-semibold">{template.name}</span>
                </div>
                <p className="mt-1 text-xs opacity-80">{template.description}</p>
              </button>
            ))}
          </div>
        )}

        {recordsLoading ? (
          <p className="text-sm text-slate-400">加载中…</p>
        ) : records.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">还没有分析，点击"添加分析方法"开始</p>
        ) : (
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {records.map((record) => {
              const template = TEMPLATE_LIST.find((t) => t.id === record.templateId);
              return (
                <div key={record.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <Link to={`/analysis/${problem.id}/${record.templateId}/${record.id}`} className="min-w-0 flex-1">
                    <span className="mr-2 text-lg">{template?.icon}</span>
                    <span className="text-sm font-medium text-slate-800">{template?.name}</span>
                    <span className="ml-2 text-xs text-slate-400">
                      {record.status === 'completed' ? '已完成' : '草稿'} · 更新于 {record.updatedAt.slice(0, 10)}
                    </span>
                  </Link>
                  <button type="button" onClick={handleDeleteAnalysis} className="shrink-0 text-xs text-rose-600 hover:underline">
                    删除
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <p className="no-print text-xs text-slate-400">
        提示：同一问题可挂多个分析方法（如 5 Why 追问 + 鱼骨图），分析结果在问题下统一管理；创建时间 {format(new Date(problem.createdAt), 'yyyy-MM-dd')}
      </p>
    </div>
  );
}
