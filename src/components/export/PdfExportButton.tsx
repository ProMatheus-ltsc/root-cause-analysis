/**
 * PDF 导出按钮：点击后把当前分析内容渲染成 PDF 并触发浏览器下载。
 * 交互流程：点击 → 调用 @react-pdf/renderer 的 pdf() 把 <PdfReport> 编译为 Blob →
 * 通过临时 <a download> 触发下载（文件名 = 记录标题 + 日期）→ 生成中按钮禁用并显示"生成 PDF…"。
 * 核心概念：@react-pdf/renderer 在浏览器端把 React 组件树渲染成 PDF 字节流，无需服务端参与。
 */
import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { PdfReport } from './PdfReport';
import type { FormRecord, FormTemplate, Problem } from '../../types';

interface PdfExportButtonProps {
  /** 关联的问题实体（可选，PDF 头部会展示问题标题与陈述） */
  problem?: Problem;
  /** 当前分析记录（含标题、状态、时间戳） */
  record: FormRecord;
  /** 分析模板（决定 PDF 里的章节结构） */
  template: FormTemplate;
  /** 当前表单值（实时取值，导出的是用户填写的最新内容） */
  values: Record<string, unknown>;
}

export function PdfExportButton({ problem, record, template, values }: PdfExportButtonProps) {
  // 生成中的标记：防止重复点击，同时用于切换按钮文案
  const [generating, setGenerating] = useState(false);

  /** 导出 PDF：把 <PdfReport> 编译为 Blob 后走临时 <a> 标签下载，最后释放 URL。 */
  async function handleExport() {
    setGenerating(true);
    try {
      const blob = await pdf(
        <PdfReport problem={problem} record={record} template={template} values={values} />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${record.title || template.name}-${record.updatedAt?.slice(0, 10) || 'draft'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF 导出失败:', err);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={generating}
      className="rounded-xl border border-surface-200 bg-surface-0 px-4 py-2.5 text-sm font-medium text-text-secondary transition hover:border-brand-300 hover:text-brand-600 disabled:opacity-50"
    >
      {generating ? '生成 PDF…' : '导出 PDF'}
    </button>
  );
}
