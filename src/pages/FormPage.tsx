/**
 * 表单填写/编辑页：根据 URL 中的 templateId(+recordId) 加载模板与记录，渲染 FormRenderer。
 * 首次自动保存后通过 onFirstSave 把 URL 从"新建"跳转到"编辑现有记录"，避免刷新后重复创建。
 */
import { useNavigate, useParams } from 'react-router-dom';
import { getTemplate } from '../templates';
import type { TemplateId } from '../types';
import { useRecord } from '../hooks/useDB';
import { FormRenderer } from '../components/FormRenderer';

export default function FormPage() {
  const { templateId, recordId } = useParams<{ templateId: string; recordId?: string }>();
  const navigate = useNavigate();
  const { record, loading } = useRecord(recordId);

  const template = templateId ? getTemplate(templateId as TemplateId) : undefined;
  if (!templateId || !template) {
    return <p className="text-sm text-rose-600">未知的分析模板</p>;
  }
  if (recordId && loading) {
    return <p className="text-sm text-slate-400">加载中…</p>;
  }
  if (recordId && !record) {
    return <p className="text-sm text-rose-600">记录不存在</p>;
  }

  return (
    <div>
      <div className="no-print mb-4 flex items-center justify-between text-sm text-slate-500">
        <span>
          {template.icon} {template.name}
        </span>
        <button type="button" onClick={() => window.print()} className="text-sky-600 hover:underline">
          打印 / 导出 PDF
        </button>
      </div>
      <FormRenderer
        template={template}
        record={record}
        onFirstSave={(newId) => navigate(`/form/${templateId}/${newId}`, { replace: true })}
      />
    </div>
  );
}
