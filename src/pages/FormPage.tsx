/**
 * 分析填写/编辑页：/analysis/:problemId/:templateId/:recordId?
 * 顶部常驻显示问题摘要卡片（做分析时随时查看问题），下方渲染分析方法表单。
 * 首次自动保存后通过 onFirstSave 把 URL 从"新建"跳转到"编辑现有记录"。
 * 交互流程：从问题详情页点击某分析方法进入 → 读取 URL 参数判断是"新建"还是"编辑" →
 *   FormRenderer 渲染表单（新建时首次自动保存会生成记录并回写新的 recordId）→ 可继续编辑、打印/导出 PDF。
 * 核心概念：URL 三段式参数 problemId / templateId / recordId 分别标识"问题 / 分析方法 / 分析记录"；
 *   recordId 缺省表示"尚未生成记录"的新建状态，FormRenderer 首次自动保存后才把它补上。
 */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getTemplate } from '../templates';
import type { TemplateId } from '../types';
import { useProblem, useRecord } from '../hooks/useDB';
import { FormRenderer } from '../components/FormRenderer';
import { ProblemSummaryCard } from '../components/ProblemSummaryCard';

/**
 * 分析表单页组件：按路由参数渲染对应分析方法的表单，支持新建与编辑两种模式。
 * props：无；全部参数来自 URL——problemId 问题 id、templateId 分析方法 id、
 *   recordId 记录 id（仅编辑已有记录时出现，新建时缺省）。
 */
export default function FormPage() {
  // useParams 读取路由动态参数；recordId 声明为可选，因为"新建"场景的 URL 里没有它
  const { problemId, templateId, recordId } = useParams<{ problemId: string; templateId: string; recordId?: string }>();
  const navigate = useNavigate();
  // useProblem 按 id 异步读取问题；useRecord 按 id 读取已有分析记录（recordId 为空时内部不会发起读取）
  const { problem, loading: problemLoading } = useProblem(problemId);
  const { record, loading } = useRecord(recordId);
  // printPreview：是否处于"准备打印"提示状态（打印对话框弹出期间显示提示条）
  const [printPreview, setPrintPreview] = useState(false);

  // 根据 URL 中的 templateId 查找分析方法模板；找不到说明路由非法，直接给出提示
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

  /**
   * 打印预览 / 导出 PDF：先显示"准备打印"提示条，延迟 300ms 再弹打印对话框。
   * 延迟的目的是让 React 先把提示条渲染出来（否则 setState 的更新可能还没生效就弹窗了）。
   */
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
        // onFirstSave：新建记录首次自动保存成功时回调——拿到新生成的记录 id 后替换 URL，
        // 让地址从"新建"（无 recordId）变成"编辑现有记录"（带 recordId），刷新页面也不丢数据
        onFirstSave={(newId) => navigate(`/analysis/${problemId}/${templateId}/${newId}`, { replace: true })}
      />
    </div>
  );
}
