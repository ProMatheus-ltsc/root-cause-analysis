/**
 * 仪表盘记录行：跳转到对应记录的编辑页，右侧展示附加说明文字（逾期天数/待复盘等）。
 */
import { Link } from 'react-router-dom';
import type { FormRecord, FormTemplate } from '../../types';

export function RecordRow({ record, template, rightText }: { record: FormRecord; template: FormTemplate; rightText?: string }) {
  return (
    <Link
      to={`/form/${record.templateId}/${record.id}`}
      className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-slate-50"
    >
      <span className="flex items-center gap-2 text-slate-700">
        <span>{template.icon}</span>
        <span className="font-medium">{record.title}</span>
      </span>
      {rightText && <span className="text-xs text-slate-400">{rightText}</span>}
    </Link>
  );
}
