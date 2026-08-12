/**
 * 渲染一组分区（当前阶段包含的所有 section）：重复段委托 RepeatableSection，
 * 非重复段直接铺开字段；collapsedByDefault 的分区用 <details> 折叠展示。
 */
import type { FormRecord, FormSection, Problem, TemplateId } from '../../types';
import { RepeatableSection } from '../RepeatableSection';
import { FieldList } from './FieldList';

interface FormTabsProps {
  sections: FormSection[];
  disabled: boolean;
  templateId: TemplateId;
  historyRecords: FormRecord[];
  problem?: Problem;
}

export function FormTabs({ sections, disabled, templateId, historyRecords, problem }: FormTabsProps) {
  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <SectionBlock key={section.id} section={section} disabled={disabled} templateId={templateId} historyRecords={historyRecords} problem={problem} />
      ))}
    </div>
  );
}

function SectionBlock({ section, disabled, templateId, historyRecords, problem }: { section: FormSection } & Omit<FormTabsProps, 'sections'>) {
  const body = section.repeatable ? (
    <RepeatableSection section={section} disabled={disabled} templateId={templateId} historyRecords={historyRecords} problem={problem} />
  ) : (
    <div className="grid gap-5 sm:grid-cols-2">
      <FieldList fields={section.fields} basePath="" disabled={disabled} templateId={templateId} historyRecords={historyRecords} />
    </div>
  );

  if (section.collapsedByDefault) {
    return (
      <details className="rounded-xl border border-surface-200 bg-surface-0 p-5 shadow-sm">
        <summary className="cursor-pointer text-sm font-bold text-text-primary">{section.title}</summary>
        {section.description && <p className="mt-1.5 text-xs text-text-tertiary">{section.description}</p>}
        <div className="mt-4">{body}</div>
      </details>
    );
  }

  return (
    <section className="animate-fade-in">
      <h3 className="mb-1.5 text-base font-bold text-text-primary">{section.title}</h3>
      {section.description && <p className="mb-4 text-xs text-text-tertiary leading-relaxed">{section.description}</p>}
      {body}
    </section>
  );
}
