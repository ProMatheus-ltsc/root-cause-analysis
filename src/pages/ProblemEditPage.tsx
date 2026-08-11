/**
 * 编辑问题页（/problem/:problemId/edit）：加载已有问题数据进行编辑。
 */
import { useNavigate, useParams } from 'react-router-dom';
import { FormProvider, useForm } from 'react-hook-form';
import { problemWizardTemplate as PROBLEM_TEMPLATE } from '../templates/problemWizard';
import { useRecords, useProblem, useSaveProblem } from '../hooks/useDB';
import { useToast } from '../hooks/useToast';
import { validateRequiredFields } from '../utils/formValidation';
import { buildDefaultValues } from '../components/FormRenderer';
import { FormTabs } from '../components/form/FormTabs';
import { useEffect, useState } from 'react';

const BRAINSTORM_MIN_COUNT = 15;

export default function ProblemEditPage() {
  const { problemId } = useParams<{ problemId: string }>();
  const navigate = useNavigate();
  const saveProblem = useSaveProblem();
  const { showToast } = useToast();
  const { records: historyRecords } = useRecords();
  const { problem, loading } = useProblem(problemId);
  const [ready, setReady] = useState(false);

  const methods = useForm<Record<string, unknown>>({
    defaultValues: buildDefaultValues(PROBLEM_TEMPLATE, undefined, ''),
  });
  const { getValues, reset } = methods;

  useEffect(() => {
    if (problem && !ready) {
      const merged = { ...buildDefaultValues(PROBLEM_TEMPLATE, undefined, ''), ...problem.data };
      reset(merged);
      setReady(true);
    }
  }, [problem, ready, reset]);

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
      await saveProblem({
        id: problem!.id,
        title,
        problemStatement,
        data: values,
        createdAt: problem!.createdAt,
      });
      showToast('问题已更新', 'success');
      navigate(`/problem/${problem!.id}`);
    } catch (err) {
      console.error('保存问题失败', err);
      showToast(`保存失败：${err instanceof Error ? err.message : String(err)}`, 'error');
    }
  }

  if (loading) return <p className="text-sm text-slate-400">加载中…</p>;
  if (!problem) return <p className="text-sm text-rose-600">问题不存在</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">编辑问题</h2>
        <p className="mt-1 text-sm text-slate-500">修改问题定义、头脑风暴等内容后保存。</p>
      </div>
      <FormProvider {...methods}>
        <form onSubmit={(e) => e.preventDefault()} className="print-area">
          <FormTabs sections={PROBLEM_TEMPLATE.sections} disabled={false} templateId="problemWizard" historyRecords={historyRecords} />
        </form>
      </FormProvider>
      <div className="no-print mt-8 flex items-center gap-3 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          保存修改
        </button>
        <button
          type="button"
          onClick={() => navigate(`/problem/${problem.id}`)}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          取消
        </button>
      </div>
    </div>
  );
}
