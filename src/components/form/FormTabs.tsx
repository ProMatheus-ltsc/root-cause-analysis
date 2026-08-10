/**
 * 渲染一组分区（当前阶段包含的所有 section）：重复段委托 RepeatableSection，
 * 非重复段直接铺开字段；collapsedByDefault 的分区用 <details> 折叠展示。
 */
import type { FormRecord, FormSection, TemplateId } from '../../types';
import { RepeatableSection } from '../RepeatableSection';
import { FieldList } from './FieldList';

interface FormTabsProps {
  sections: FormSection[];
  disabled: boolean;
  templateId: TemplateId;
  historyRecords: FormRecord[];
}

export function FormTabs({ sections, disabled, templateId, historyRecords }: FormTabsProps) {
  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <SectionBlock key={section.id} section={section} disabled={disabled} templateId={templateId} historyRecords={historyRecords} />
      ))}
    </div>
  );
}

function SectionBlock({ section, disabled, templateId, historyRecords }: { section: FormSection } & Omit<FormTabsProps, 'sections'>) {
  const body = section.repeatable ? (
    <RepeatableSection section={section} disabled={disabled} templateId={templateId} historyRecords={historyRecords} />
  ) : (
    <div className="grid gap-5 sm:grid-cols-2">
      <FieldList fields={section.fields} basePath="" disabled={disabled} templateId={templateId} historyRecords={historyRecords} />
    </div>
  );

  if (section.collapsedByDefault) {
    return (
      <details className="rounded-lg border border-slate-200 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-800">{section.title}</summary>
        {section.description && <p className="mt-1 text-xs text-slate-500">{section.description}</p>}
        <div className="mt-4">{body}</div>
      </details>
    );
  }

  return (
    <section>
      <h3 className="mb-1 text-base font-semibold text-slate-800">{section.title}</h3>
      {section.description && <p className="mb-3 text-xs text-slate-500">{section.description}</p>}
      {body}
    </section>
  );
}
