/**
 * 渲染一组分区（当前阶段包含的所有 section）。
 * 分区（section）的三种形态：
 * - repeatable 段：委托 RepeatableSection 渲染"可增删条目的重复表单"；
 * - 非重复段：用两列网格直接铺开字段（通过 FieldList）；
 * - collapsedByDefault 段：默认折叠，用原生 <details>/<summary> 实现开合。
 */
import type { FormRecord, FormSection, Problem, TemplateId } from '../../types';
import { RepeatableSection } from '../RepeatableSection';
import { FieldList } from './FieldList';

/** FormTabs 的 props：sections 为模板中的分区数组；其余为逐层透传给输入组件的表单上下文。 */
interface FormTabsProps {
  sections: FormSection[];
  disabled: boolean;
  templateId: TemplateId;
  historyRecords: FormRecord[];
  problem?: Problem;
  /** factors 段候选 ≤ 15 自动引入填满后回调（自动进入关系矩阵阶段） */
  onAutoFilled?: () => void;
}

/**
 * 分区列表：按顺序渲染当前阶段的所有分区，每个分区交给内部子组件 SectionBlock 处理。
 */
export function FormTabs({ sections, disabled, templateId, historyRecords, problem, onAutoFilled }: FormTabsProps) {
  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <SectionBlock
          key={section.id}
          section={section}
          disabled={disabled}
          templateId={templateId}
          historyRecords={historyRecords}
          problem={problem}
          onAutoFilled={onAutoFilled}
        />
      ))}
    </div>
  );
}

/**
 * 单个分区的渲染容器（FormTabs 的内部子组件，不对外导出）。
 * 分两步组装：
 * 1. 先根据 section.repeatable 决定表单主体 body：
 *    - 重复段 → RepeatableSection（可增删条目）；
 *    - 非重复段 → 两列网格 + FieldList 直接铺开字段。
 * 2. 再根据 section.collapsedByDefault 决定外层壳：
 *    - 默认折叠 → <details>/<summary> 折叠卡片（点击标题展开）；
 *    - 否则 → 普通 <section> 配标题与描述。
 */
function SectionBlock({
  section,
  disabled,
  templateId,
  historyRecords,
  problem,
  onAutoFilled,
}: { section: FormSection } & Omit<FormTabsProps, 'sections'>) {
  const body = section.repeatable ? (
    <RepeatableSection
      section={section}
      disabled={disabled}
      templateId={templateId}
      historyRecords={historyRecords}
      problem={problem}
      onAutoFilled={onAutoFilled}
    />
  ) : (
    <div className="grid gap-5 sm:grid-cols-2">
      <FieldList fields={section.fields} basePath="" disabled={disabled} templateId={templateId} historyRecords={historyRecords} problem={problem} />
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
