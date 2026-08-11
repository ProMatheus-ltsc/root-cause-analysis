/**
 * 问题详情页（/problem/:problemId）：以问题为导向。
 * 展示问题摘要 + 该问题下的所有根因分析记录，可添加新的分析方法（同一问题挂多个分析）。
 */
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { TEMPLATE_LIST } from '../templates';
import type { TemplateId } from '../types';
import { useProblem, useRecordsByProblem, useSaveRecord, useDeleteRecord } from '../hooks/useDB';
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
  const deleteRecord = useDeleteRecord();
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  async function handleDeleteAnalysis(id: string) {
    if (deletingId === id) {
      await deleteRecord(id);
      showToast('分析记录已删除', 'success');
      setDeletingId(null);
    } else {
      setDeletingId(id);
    }
  }

  if (loading) return <p className="text-sm text-slate-400">加载中…</p>;
  if (!problem) return <p className="text-sm text-rose-600">问题不存在</p>;

  return (
    <div className="space-y-6">
      <div className="no-print flex items-center justify-between">
        <Link to="/" className="text-sm text-sky-600 hover:underline">
          ← 返回问题列表
        </Link>
        <Link to={`/problem/${problem.id}/edit`} className="rounded-md border border-sky-300 px-3 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-50">
          编辑问题定义
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
          <div className="mb-4 space-y-3">
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-medium">如何选择分析方法？</p>
              <ul className="mt-1 list-disc pl-4 text-xs leading-relaxed">
                <li><strong>要因分析法</strong>（推荐）：适合多因素复杂问题，通过 DEMATEL 矩阵量化因果关系、帕累托找出关键少数</li>
                <li><strong>5 Why 追问法</strong>：适合因果链条清晰的问题，通过层层追问抵达根因</li>
                <li><strong>鱼骨图分析法</strong>：适合需要从人/机/料/法/环/测多维度排查的系统性问题</li>
                <li><strong>时间线分析法</strong>：适合事故/故障的事后复盘，按时间还原事件经过</li>
                <li><strong>对比分析法</strong>：适合"为什么有时正常有时异常"的问题，对比找差异</li>
                <li><strong>系统思考分析</strong>：适合反复出现的循环性问题，找出系统杠杆点</li>
                <li><strong>技术故障根因分析</strong>：适合生产/系统故障，记录排查过程并归因</li>
              </ul>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                    {template.recommended && (
                      <span className="ml-auto shrink-0 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                        推荐
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs opacity-80">{template.description}</p>
                </button>
              ))}
            </div>
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
                  <button
                    type="button"
                    onClick={() => handleDeleteAnalysis(record.id)}
                    className="shrink-0 text-xs text-rose-600 hover:underline"
                  >
                    {deletingId === record.id ? '确认删除？' : '删除'}
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

      {records.filter((r) => r.status === 'completed').length > 0 && (
        <section className="no-print">
          <h3 className="mb-3 text-base font-semibold text-slate-900">根因汇总对比</h3>
          <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
            {records.filter((r) => r.status === 'completed').map((record) => {
              const template = TEMPLATE_LIST.find((t) => t.id === record.templateId);
              const rootCauseSummary = typeof record.data['rootCauseSummary'] === 'string' ? record.data['rootCauseSummary'] : '';
              const rootCauseType = typeof record.data['rootCauseType'] === 'string' ? record.data['rootCauseType'] : '';
              return (
                <div key={record.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span>{template?.icon}</span>
                    <span className="font-medium text-slate-800">{template?.name}</span>
                    {rootCauseType && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{rootCauseType}</span>}
                  </div>
                  {rootCauseSummary && <p className="mt-1 text-sm text-slate-600">{rootCauseSummary}</p>}
                  {!rootCauseSummary && <p className="mt-1 text-xs text-slate-400">（未填写根因总结）</p>}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
