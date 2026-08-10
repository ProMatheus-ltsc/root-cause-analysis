/**
 * 分析填写/编辑页：/analysis/:problemId/:templateId/:recordId?
 * 顶部常驻显示问题摘要卡片（做分析时随时查看问题），下方渲染分析方法表单。
 * 首次自动保存后通过 onFirstSave 把 URL 从"新建"跳转到"编辑现有记录"。
 */
import { useNavigate, useParams } from 'react-router-dom';
import { getTemplate } from '../templates';
import type { TemplateId } from '../types';
import { useProblem, useRecord } from '../hooks/useDB';
import { FormRenderer } from '../components/FormRenderer';
import { ProblemSummaryCard } from '../components/ProblemSummaryCard';

export default function FormPage() {
  const { problemId, templateId, recordId } = useParams<{ problemId: string; templateId: string; recordId?: string }>();
  const navigate = useNavigate();
  const { problem, loading: problemLoading } = useProblem(problemId);
  const { record, loading } = useRecord(recordId);

  const template = templateId ? getTemplate(templateId as TemplateId) : undefined;
  if (!problemId || !templateId || !template) {
    return <p className="text-sm text-rose-600">未知的分析模板</p>;
  }
  if (recordId && loading) {
    return <p className="text-sm text-slate-400">加载中…</p>;
  }
  if (recordId && !record) {
    return <p className="text-sm text-rose-600">记录不存在</p>;
  }
  if (problemLoading) {
    return <p className="text-sm text-slate-400">加载中…</p>;
  }
  if (!problem) {
    return <p className="text-sm text-rose-600">问题不存在</p>;
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center justify-between text-sm text-slate-500">
        <span>
          {template.icon} {template.name} · 基于问题：{problem.title}
        </span>
        <button type="button" onClick={() => window.print()} className="text-sky-600 hover:underline">
          打印 / 导出 PDF
        </button>
      </div>
      <ProblemSummaryCard problem={problem} />
      <FormRenderer
        template={template}
        record={record}
        problemId={problemId}
        problemTitle={problem.title}
        onFirstSave={(newId) => navigate(`/analysis/${problemId}/${templateId}/${newId}`, { replace: true })}
      />
    </div>
  );
}
