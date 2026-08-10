/**
 * 问题鉴别向导页（/new）：通用前置流程。
 * 第 1 步：先严格鉴别问题（问题定义 + 5W2H IS/IS NOT，与具体分析方法无关）；
 * 第 2 步：完成鉴别后选择分析方法，以所选模板创建记录并把鉴别结果带过去。
 * 体现"先明确问题，再进行根因分析"的方法论。
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormProvider, useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { TEMPLATE_LIST } from '../templates';
import { createProblemDefinitionSection, createProblemIdentificationSection } from '../templates/shared';
import type { FormTemplate } from '../types';
import { useRecords, useSaveRecord } from '../hooks/useDB';
import { useToast } from '../hooks/useToast';
import { validateRequiredFields } from '../utils/formValidation';
import { FormTabs } from '../components/form/FormTabs';
import { TEMPLATE_COLORS } from '../constants/templateMeta';

/** 通用问题鉴别表单（不绑定任何分析方法） */
const IDENTIFY_TEMPLATE: FormTemplate = {
  id: 'fiveWhy',
  name: '问题鉴别',
  icon: '🎯',
  description: '通用问题鉴别前置',
  sections: [createProblemDefinitionSection(), createProblemIdentificationSection()],
};

export default function ProblemWizardPage() {
  const navigate = useNavigate();
  const saveRecord = useSaveRecord();
  const { showToast } = useToast();
  const { records: historyRecords } = useRecords();
  const [step, setStep] = useState<1 | 2>(1);

  const methods = useForm<Record<string, unknown>>({ defaultValues: {} });
  const { getValues } = methods;

  function handleNext() {
    const missing = validateRequiredFields(IDENTIFY_TEMPLATE, getValues());
    if (missing.length > 0) {
      showToast(`请完善必填项：${missing.slice(0, 5).map((m) => m.label).join('、')}`, 'error');
      return;
    }
    setStep(2);
  }

  async function handleSelectTemplate(template: FormTemplate) {
    const values = getValues();
    const title =
      typeof values.title === 'string' && values.title.trim() ? values.title.trim() : `${template.name} ${format(new Date(), 'yyyy-MM-dd')}`;
    const saved = await saveRecord({
      templateId: template.id,
      title,
      data: values,
      status: 'draft',
    });
    navigate(`/form/${template.id}/${saved.id}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
          <span className={step === 1 ? 'font-semibold text-sky-600' : ''}>① 鉴别问题</span>
          <span>→</span>
          <span className={step === 2 ? 'font-semibold text-sky-600' : ''}>② 选择分析方法</span>
        </div>
        <h2 className="text-lg font-semibold text-slate-900">
          {step === 1 ? '问题鉴别（通用前置）' : '选择分析方法'}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {step === 1
            ? '先不选方法——严格界定"是不是问题、是哪类问题、边界在哪"，再进入根因分析。'
            : '问题已明确，现在选择最适合的分析方法（鉴别结果会自动带入表单）。'}
        </p>
      </div>

      {step === 1 ? (
        <>
          <FormProvider {...methods}>
            <form onSubmit={(e) => e.preventDefault()} className="print-area">
              <FormTabs sections={IDENTIFY_TEMPLATE.sections} disabled={false} templateId="fiveWhy" historyRecords={historyRecords} />
            </form>
          </FormProvider>
          <div className="no-print mt-8 flex items-center gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={handleNext}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
            >
              下一步：选择分析方法
            </button>
            <span className="text-xs text-slate-400">
              必填项：问题标题、一句话陈述、问题判定、问题分类、现象描述，以及 4W2H 六维（是什么/是谁/何时/何地/如何/多少）与目标状态
            </span>
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLATE_LIST.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleSelectTemplate(template)}
                className={`rounded-lg border ${TEMPLATE_COLORS[template.id]} p-4 text-left transition hover:shadow-md`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{template.icon}</span>
                  <span className="font-semibold">{template.name}</span>
                </div>
                <p className="mt-2 text-xs opacity-80">{template.description}</p>
              </button>
            ))}
          </div>
          <div className="no-print mt-8 flex items-center gap-3 border-t border-slate-200 pt-4">
            <button type="button" onClick={() => setStep(1)} className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
              上一步：修改问题鉴别
            </button>
          </div>
        </>
      )}
    </div>
  );
}
