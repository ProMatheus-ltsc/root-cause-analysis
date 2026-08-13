/**
 * 仪表盘记录行：跳转到对应记录的编辑页，右侧展示附加说明文字（逾期天数/待复盘等）。
 * 整行是一个 <Link>，点击后进入 /form/:templateId/:recordId 继续编辑该记录。
 */
import { Link } from 'react-router-dom';
import type { FormRecord, FormTemplate } from '../../types';

/**
 * 单条分析记录行。
 * @param record 分析记录（含标题、模板 id 等）
 * @param template 记录所属模板，用于取模板图标
 * @param rightText 行尾附加文字（如更新时间、待复盘天数），可选
 */
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
