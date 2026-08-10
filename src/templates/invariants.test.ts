import { describe, expect, it } from 'vitest';
import { TEMPLATE_LIST } from './index';

describe('template phase invariants', () => {
  it('every required field within a phase is covered by that phase completionFields, so a required field can never end up locked read-only before being satisfied', () => {
    for (const template of TEMPLATE_LIST) {
      if (!template.phases) continue;
      for (const phase of template.phases) {
        const requiredFieldIds = phase.sectionIndices.flatMap((idx) => {
          const section = template.sections[idx];
          return section.fields.filter((f) => f.required).map((f) => f.id);
        });
        const missing = requiredFieldIds.filter((id) => !phase.completionFields.includes(id));
        expect(missing, `${template.id} / 阶段「${phase.label}」缺少必填字段的 completionFields 覆盖: ${missing.join(', ')}`).toEqual([]);
      }
    }
  });
});
