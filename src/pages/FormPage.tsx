/**
 * 分析填写/编辑页：/analysis/:problemId/:templateId/:recordId?
 * 顶部常驻显示问题摘要卡片（做分析时随时查看问题），下方渲染分析方法表单。
 * 首次自动保存后通过 onFirstSave 把 URL 从"新建"跳转到"编辑现有记录"。
 */
import { useState } from 'react';
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
  const [printPreview, setPrintPreview] = useState(false);

  const template = templateId ? getTemplate(templateId as TemplateId) : undefined;
  if (!problemId || !templateId || !template) {
    return <p className="text-sm text-danger-600">未知的分析模板</p>;
  }
  if (recordId && loading) {
    return <p className="text-sm text-text-tertiary">加载中…</p>;
  }
  if (recordId && !record) {
    return <p className="text-sm text-danger-600">记录不存在</p>;
  }
  if (problemLoading) {
    return <p className="text-sm text-text-tertiary">加载中…</p>;
  }
  if (!problem) {
    return <p className="text-sm text-danger-600">问题不存在</p>;
  }

  function handlePrint() {
    setPrintPreview(true);
    setTimeout(() => {
      window.print();
      setPrintPreview(false);
    }, 300);
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center justify-between text-sm text-text-secondary">
        <span>
          {template.icon} {template.name} · 基于问题：{problem.title}
        </span>
        <div className="flex items-center gap-3">
          <button type="button" onClick={handlePrint} className="text-brand-600 hover:underline">
            打印预览 / 导出 PDF
          </button>
        </div>
      </div>
      {printPreview && (
        <div className="no-print rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm text-brand-700">
          正在准备打印预览…打印对话框即将弹出，请确认内容后选择"打印"或"另存为 PDF"。
        </div>
      )}
      <ProblemSummaryCard problem={problem} />
      <FormRenderer
        template={template}
        record={record}
        problemId={problemId}
        problemTitle={problem.title}
        problem={problem}
        onFirstSave={(newId) => navigate(`/analysis/${problemId}/${templateId}/${newId}`, { replace: true })}
      />
    </div>
  );
}
