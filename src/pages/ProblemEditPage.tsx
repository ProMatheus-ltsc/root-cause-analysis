/**
 * 编辑问题页（/problem/:problemId/edit）：加载已有问题数据进行编辑。
 * 交互流程：从问题详情页点"编辑问题定义"进入 → useParams 拿到 problemId →
 *   useProblem 读取已有问题 → 数据到达后把"模板默认值 + 已有 data"合并回填进表单 →
 *   修改后保存（先校验必填项、再校验头脑风暴至少 15 条）→ 保存成功跳回问题详情页。
 * 核心概念：与 ProblemWizardPage 共用同一套表单模板（PROBLEM_TEMPLATE），
 *   区别只是编辑页的初始值是已有问题数据，而向导页是空值 + 今天日期。
 */
import { useNavigate, useParams } from 'react-router-dom';
import { FormProvider, useForm } from 'react-hook-form';
import { problemWizardTemplate as PROBLEM_TEMPLATE } from '../templates/problemWizard';
import { useRecords, useProblem, useSaveProblem } from '../hooks/useDB';
import { useToast } from '../hooks/useToast';
import { validateRequiredFields } from '../utils/formValidation';
import { buildDefaultValues } from '../components/FormRenderer';
import { FormTabs } from '../components/form/FormTabs';
import { FloatExpandToggleButton, RepeatableExpandProvider } from '../components/RepeatableSection';
import { useEffect, useState } from 'react';

/** 头脑风暴最少原因数（发散阶段的覆盖度要求，与向导页保持一致） */
const BRAINSTORM_MIN_COUNT = 15;

/**
 * 编辑问题页组件：把已有问题数据回填到问题向导表单中，供用户修改后保存。
 * props：无；问题 id 来自路由参数 problemId。
 */
export default function ProblemEditPage() {
  // useParams 读取路由参数（本页只关心 problemId）
  const { problemId } = useParams<{ problemId: string }>();
  const navigate = useNavigate();
  const saveProblem = useSaveProblem();
  const { showToast } = useToast();
  // historyRecords：已有分析记录，传给 FormTabs 供"参考历史"等区块使用
  const { records: historyRecords } = useRecords();
  // useProblem 按 id 异步读取要编辑的问题
  const { problem, loading } = useProblem(problemId);
  // ready：标记表单是否已完成"数据回填"，防止 useEffect 里对表单重复 reset
  const [ready, setReady] = useState(false);

  // react-hook-form 表单容器：先用模板默认值（空值）初始化，
  // 真实数据到达后再用 reset 覆盖（见下方 useEffect）
  const methods = useForm<Record<string, unknown>>({
    defaultValues: buildDefaultValues(PROBLEM_TEMPLATE, undefined, '', ''),
  });
  const { getValues, reset } = methods;

  // 数据加载完成后，把"模板默认值 + 问题已有 data"合并后回填进表单。
  // 合并的原因是表单模板可能新增过字段，旧数据没有这些字段，用默认值兜底；
  // ready 标记保证这个问题数据只回填一次
  useEffect(() => {
    if (problem && !ready) {
      const merged = { ...buildDefaultValues(PROBLEM_TEMPLATE, undefined, '', ''), ...problem.data };
      reset(merged);
      setReady(true);
    }
  }, [problem, ready, reset]);

  /**
   * 保存修改：两步校验（必填项 → 头脑风暴数量下限）都通过后，
   * 用 saveProblem 更新问题（保留原 id 与 createdAt）并跳回问题详情页。
   * getValues() 是 react-hook-form 提供的"读取当前全部表单值"的方法。
   */
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
