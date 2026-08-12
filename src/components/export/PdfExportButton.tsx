import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { PdfReport } from './PdfReport';
import type { FormRecord, FormTemplate, Problem } from '../../types';

interface PdfExportButtonProps {
  problem?: Problem;
  record: FormRecord;
  template: FormTemplate;
  values: Record<string, unknown>;
}

export function PdfExportButton({ problem, record, template, values }: PdfExportButtonProps) {
  const [generating, setGenerating] = useState(false);

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
