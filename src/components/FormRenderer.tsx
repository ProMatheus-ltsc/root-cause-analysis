/**
 * 表单引擎：将 FormTemplate 渲染为带多阶段生命周期的交互式表单。
 * 自动保存草稿（30 秒间隔 + 切换阶段时保存），阶段锁定/只读、可重复段、条件字段、
 * 计算字段均由模板配置驱动，引擎内不出现按 template.id 分支的特殊逻辑。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { format } from 'date-fns';
import type { FormRecord, FormTemplate } from '../types';
import { useRecords, useSaveRecord } from '../hooks/useDB';
import { usePhaseLogic } from '../hooks/usePhaseLogic';
import { useToast } from '../hooks/useToast';
import { getCurrentPhaseIndex, isPhaseCompletionSatisfied, resolveDefaultValue, validateRequiredFields } from '../utils/formValidation';
import { PhaseIndicator } from './PhaseIndicator';
import { FormTabs } from './form/FormTabs';

/** 解析模板默认值：按 section/field 遍历，注入 defaultValue（问题向导页与编辑页共用）。 */
export function buildDefaultValues(template: FormTemplate, record: FormRecord | undefined, todayISO: string): Record<string, unknown> {
  const data = record?.data ?? {};
  const values: Record<string, unknown> = {};
  for (const section of template.sections) {
    if (section.repeatable) {
      values[section.id] = data[section.id] ?? [];
      continue;
    }
    for (const field of section.fields) {
      values[field.id] = resolveDefaultValue(field, data[field.id], todayISO);
    }
  }
  return values;
}

function getRecordTitle(template: FormTemplate, values: Record<string, unknown>, problemTitle?: string): string {
  const title = values['title'];
  if (typeof title === 'string' && title.trim()) return title.trim();
  if (problemTitle && problemTitle.trim()) return problemTitle.trim();
  return `${template.name} ${format(new Date(), 'yyyy-MM-dd')}`;
}

interface FormRendererProps {
  template: FormTemplate;
  record?: FormRecord;
  /** 关联的问题实体 id（问题为导向） */
  problemId?: string;
  /** 问题标题：用作分析记录标题 */
  problemTitle?: string;
  onFirstSave?: (recordId: string) => void;
}

export function FormRenderer({ template, record, problemId, problemTitle, onFirstSave }: FormRendererProps) {
  const todayISO = format(new Date(), 'yyyy-MM-dd');
  const saveRecord = useSaveRecord();
  const { showToast } = useToast();
  const { records: historyRecords } = useRecords();

  const defaultValues = useMemo(() => buildDefaultValues(template, record, todayISO), [template, record, todayISO]);
  const methods = useForm<Record<string, unknown>>({ defaultValues });
  const { getValues } = methods;

  const createdAtISO = record?.createdAt ?? todayISO;
  const [committedValues, setCommittedValues] = useState(defaultValues);
  const phaseLogic = usePhaseLogic(template, committedValues, createdAtISO);

  const [activePhaseIndex, setActivePhaseIndex] = useState(() =>
    template.phases ? getCurrentPhaseIndex(template, defaultValues, { todayISO, createdAtISO }) : 0,
  );

  const recordIdRef = useRef(record?.id);
  const recordCreatedAtRef = useRef(record?.createdAt);
  const statusRef = useRef<'draft' | 'completed'>(record?.status ?? 'draft');
  const dirtyRef = useRef(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | undefined>(undefined);

  async function persist(status: 'draft' | 'completed', { commitPhase = false } = {}): Promise<FormRecord> {
    const currentValues = getValues();
    const title = getRecordTitle(template, currentValues, problemTitle);
    const saved = await saveRecord({
      id: recordIdRef.current,
      templateId: template.id,
      problemId,
      title,
      data: currentValues,
      status,
      createdAt: recordCreatedAtRef.current,
    });
    const isFirstSave = !recordIdRef.current;
    recordIdRef.current = saved.id;
    recordCreatedAtRef.current = saved.createdAt;
    statusRef.current = saved.status;
    if (commitPhase) {
      setCommittedValues(currentValues);
    }
    setLastSavedAt(new Date());
    dirtyRef.current = false;
    if (isFirstSave) onFirstSave?.(saved.id);
    return saved;
  }

  useEffect(() => {
    const timer = setInterval(() => {
      persist(statusRef.current);
    }, 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 标记"自上次保存后是否有未保存的改动"，用于关闭页面/离开路由时尽力补一次保存。
  useEffect(() => {
    const subscription = methods.watch(() => {
      dirtyRef.current = true;
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 关闭/刷新页面前尽力保存一次并提示确认；IndexedDB 写入是异步的，无法保证在卸载前写完。
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      persist(statusRef.current);
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 应用内切换路由离开该表单时（不会触发 beforeunload）同样尽力补一次保存。
  useEffect(() => {
    return () => {
      if (dirtyRef.current) {
        persist(statusRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getScopedMissingFields(activeIdx: number) {
    const currentValues = getValues();
    const allMissing = validateRequiredFields(template, currentValues);
    if (!template.phases) return allMissing;
    const accessibleIndices = new Set(template.phases.slice(0, activeIdx + 1).flatMap((p) => p.sectionIndices));
    const accessibleSectionIds = new Set(Array.from(accessibleIndices).map((i) => template.sections[i].id));
    return allMissing.filter((m) => accessibleSectionIds.has(m.sectionId.split('[')[0]));
  }

  async function handleSelectPhase(idx: number) {
    await persist(statusRef.current, { commitPhase: true });
    setActivePhaseIndex(idx);
  }

  function handleLockedClick(_idx: number) {
    showToast('请先完成前面的阶段', 'error');
  }

  async function handlePrimaryAction() {
    const missing = getScopedMissingFields(activePhaseIndex);
    if (missing.length > 0) {
      showToast(`请完善必填项：${missing.slice(0, 5).map((m) => m.label).join('、')}`, 'error');
      return;
    }
    const phase = template.phases?.[activePhaseIndex];
    if (phase && !phase.completesRecord) {
      const currentValues = getValues();
      if (!isPhaseCompletionSatisfied(template, phase, currentValues)) {
        showToast('当前阶段尚未完成，请继续填写', 'error');
        return;
      }
    }
    const willComplete = !template.phases || phase?.completesRecord;
    const saved = await persist(willComplete ? 'completed' : statusRef.current, { commitPhase: true });
    const ctx = { todayISO, createdAtISO: saved.createdAt };
    const newIdx = template.phases ? getCurrentPhaseIndex(template, getValues(), ctx) : 0;
    setActivePhaseIndex(newIdx);
    showToast(willComplete ? '已保存并标记完成' : '已保存，进入下一阶段', 'success');
  }

  const phases = template.phases;
  const activeSections = phases ? phases[activePhaseIndex].sectionIndices.map((i) => template.sections[i]) : template.sections;
  const disabled = phases ? phaseLogic.isSectionLocked(activePhaseIndex) || phaseLogic.isSectionReadOnly(activePhaseIndex) : false;
  const activePhase = phases?.[activePhaseIndex];
  const isLastPhase = phases ? activePhaseIndex === phases.length - 1 : true;

  return (
    <FormProvider {...methods}>
      <form onSubmit={(e) => e.preventDefault()} className="print-area">
        {phases && (
          <PhaseIndicator
            phases={phases}
            activePhaseIndex={activePhaseIndex}
            isSectionLocked={phaseLogic.isSectionLocked}
            isSectionReadOnly={phaseLogic.isSectionReadOnly}
            onSelect={handleSelectPhase}
            onLockedClick={handleLockedClick}
          />
        )}
        <FormTabs sections={activeSections} disabled={disabled} templateId={template.id} historyRecords={historyRecords} />
        {!disabled && (
          <div className="no-print mt-8 flex items-center gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={handlePrimaryAction}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
            >
              {!phases ? '完成' : activePhase?.completesRecord ? '保存并标记完成' : isLastPhase ? '保存' : '保存并进入下一阶段'}
            </button>
            <span className="text-xs text-slate-400">
              {lastSavedAt ? `上次自动保存于 ${format(lastSavedAt, 'HH:mm:ss')}` : '系统每 30 秒自动保存草稿'}
            </span>
          </div>
        )}
      </form>
    </FormProvider>
  );
}
