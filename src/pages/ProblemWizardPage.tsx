/**
 * 新建问题向导页（/new）：以问题为导向的第一环。
 * 填写问题定义/鉴别/整理（4W2H 表格 → 判定 → 分类 → 目标 → 标准陈述 → 标题/一句话陈述），
 * 保存为独立的问题实体（Problem）；后续在问题详情页选择分析方法，同一问题可挂多个分析。
 */
import { useNavigate } from 'react-router-dom';
import { FormProvider, useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { useRecords, useSaveProblem } from '../hooks/useDB';
import { useToast } from '../hooks/useToast';
import { validateRequiredFields } from '../utils/formValidation';
import { buildDefaultValues } from '../components/FormRenderer';
import { FormTabs } from '../components/form/FormTabs';
import { FloatExpandToggleButton, RepeatableExpandProvider } from '../components/RepeatableSection';
import { problemWizardTemplate as PROBLEM_TEMPLATE } from '../templates/problemWizard';

/** 头脑风暴最少原因数（发散阶段的覆盖度要求） */
const BRAINSTORM_MIN_COUNT = 15;

export default function ProblemWizardPage() {
  const navigate = useNavigate();
  const saveProblem = useSaveProblem();
  const { showToast } = useToast();
  const { records: historyRecords } = useRecords();

  const methods = useForm<Record<string, unknown>>({
    defaultValues: buildDefaultValues(PROBLEM_TEMPLATE, undefined, format(new Date(), 'yyyy-MM-dd')),
  });
  const { getValues } = methods;

  async function handleSave() {
    try {
      const missing = validateRequiredFields(PROBLEM_TEMPLATE, getValues());
      if (missing.length > 0) {
        showToast(`请完善必填项：${missing.map((m) => m.label).join('、')}`, 'error');
        return;
      }
      const values = getValues();
      const brainstorm = Array.isArray(values['brainstorm']) ? (values['brainstorm'] as Record<string, unknown>[]) : [];
      if (brainstorm.length < BRAINSTORM_MIN_COUNT) {
        showToast(`头脑风暴至少需要列出 ${BRAINSTORM_MIN_COUNT} 个可能的原因，当前 ${brainstorm.length} 个`, 'error');
        return;
      }
      const title = typeof values.title === 'string' && values.title.trim() ? values.title.trim() : '未命名问题';
      const problemStatement = typeof values.problemStatement === 'string' ? (values.problemStatement as string).trim() : '';
      const saved = await saveProblem({
        title,
        problemStatement,
        data: values,
      });
      showToast('问题已保存', 'success');
      navigate(`/problem/${saved.id}`);
    } catch (err) {
      console.error('保存问题失败', err);
      showToast(`保存失败：${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">新建问题</h2>
        <p className="mt-1 text-sm text-slate-500">
          流程：4W2H 全面分析 → 判定 → 分类 → 目标（问题 = 目标 − 现实）→ 标题与一句话陈述 → 原因头脑风暴（至少 {BRAINSTORM_MIN_COUNT} 个候选原因，供后续分析确认根因）。
        </p>
      </div>
      <FormProvider {...methods}>
        <RepeatableExpandProvider>
          <form onSubmit={(e) => e.preventDefault()} className="print-area">
            <FormTabs sections={PROBLEM_TEMPLATE.sections} disabled={false} templateId="problemWizard" historyRecords={historyRecords} />
          </form>
          <FloatExpandToggleButton />
        </RepeatableExpandProvider>
      </FormProvider>
      <div className="no-print mt-8 flex items-center gap-3 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          保存问题
        </button>
        <span className="text-xs text-slate-400">保存后可选择分析方法挂到该问题上</span>
      </div>
    </div>
  );
}
