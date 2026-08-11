import { createBrainstormSection, createProblemDefinitionSection, createProblemSummarySection } from './shared';
import type { FormTemplate } from '../types';

export const problemWizardTemplate: FormTemplate = {
  id: 'problemWizard',
  name: '问题定义',
  icon: '🎯',
  description: '问题实体表单',
  sections: [createProblemDefinitionSection(), createProblemSummarySection(), createBrainstormSection()],
};
