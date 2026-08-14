/**
 * 表单引擎：将 FormTemplate 渲染为带多阶段生命周期的交互式表单。
 * 自动保存草稿（30 秒间隔 + 切换阶段时保存），阶段锁定/只读、可重复段、条件字段、
 * 计算字段均由模板配置驱动，引擎内不出现按 template.id 分支的特殊逻辑。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { format } from 'date-fns';
import type { FormRecord, FormTemplate, Problem } from '../types';
import { useRecords, useSaveRecord } from '../hooks/useDB';
import { usePhaseLogic } from '../hooks/usePhaseLogic';
import { useToast } from '../hooks/useToast';
import { useSnapshots } from '../hooks/useSnapshots';
import { getCurrentPhaseIndex, isPhaseCompletionSatisfied, resolveDefaultValue, validateRequiredFields } from '../utils/formValidation';
import { buildAnalysisExportJson } from '../utils/exportAnalysis';
import { PhaseIndicator } from './PhaseIndicator';
import { FormTabs } from './form/FormTabs';
import { VisualizationPanel } from './visualize/VisualizationPanel';
import { SnapshotList } from './history/SnapshotList';
import { PdfExportButton } from './export/PdfExportButton';
import { FloatExpandToggleButton, RepeatableExpandProvider } from './RepeatableSection';

/** 解析模板默认值：按 section/field 遍历，注入 defaultValue（问题向导页与编辑页共用）。 */
export function buildDefaultValues(template: FormTemplate, record: FormRecord | undefined, todayISO: string, nowISO: string): Record<string, unknown> {
  const data = record?.data ?? {};
  const values: Record<string, unknown> = {};
  for (const section of template.sections) {
    if (section.repeatable) {
      const existing = data[section.id];
      if (existing && Array.isArray(existing) && existing.length > 0) {
        values[section.id] = existing;
      } else {
        const prefillCount = section.minEntries ?? 3;
        const emptyEntry: Record<string, unknown> = {};
        for (const f of section.fields) {
          emptyEntry[f.id] = '';
        }
        values[section.id] = Array.from({ length: prefillCount }, () => ({ ...emptyEntry }));
      }
      continue;
    }
    for (const field of section.fields) {
      values[field.id] = resolveDefaultValue(field, data[field.id], todayISO, nowISO);
    }
  }
  return values;
}

/** 生成分析记录在列表里显示的标题：优先用用户填写的 title 字段，其次用问题标题，最后兜底为"模板名 + 日期"。 */
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
  /** 问题实体：用于导出 JSON（问题详情 + 分析结果） */
  problem?: Problem;
  onFirstSave?: (recordId: string) => void;
}

/**
 * 表单渲染器主组件：承载整个分析表单的生命周期。
 * - 编辑态与新建态共用：有 record 时加载历史数据，否则按模板生成空表单。
 * - 提供自动保存（10 秒轮询 + 离开页面/路由时补存）、阶段切换、版本快照、JSON 复制、PDF 导出。
 * - 阶段（phases）模式下：前面阶段锁定/只读，只有当前及已完成阶段可填写。
 */
export function FormRenderer({ template, record, problemId, problemTitle, problem, onFirstSave }: FormRendererProps) {
  const todayISO = format(new Date(), 'yyyy-MM-dd');
  const nowISO = format(new Date(), "yyyy-MM-dd'T'HH:mm");
  const saveRecord = useSaveRecord();
  const { showToast } = useToast();
  const { records: historyRecords } = useRecords();

  const defaultValues = useMemo(() => buildDefaultValues(template, record, todayISO, nowISO), [template, record, todayISO, nowISO]);
  const methods = useForm<Record<string, unknown>>({ defaultValues });
  const { getValues, reset, setValue, watch } = methods;
  // VisualizationPanel 需要看实时填写的值，不能用 committedValues（只有 persist 后才更新）
  const watchedValues = watch();

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
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const { snapshots, loading: snapshotsLoading, createSnapshot, removeSnapshot } = useSnapshots(recordIdRef.current);

  /** 统一保存入口：把当前表单值写入 IndexedDB。
   * commitPhase 为 true 时还会把当前值提交为"已确认值"（阶段切换/手动保存时使用），
   * 因为阶段锁定判断依赖 committedValues，而不是实时输入值。 */
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

  /** 用 ref 保存最新的 persist，供只挂载一次的定时器读取，避免定时器闭包拿到过期函数。 */
  const persistRef = useRef(persist);
  persistRef.current = persist;

  /** 自动保存：每 10 秒检查一次 dirty 标记，有未保存改动就写库（静默保存，不打断用户）。 */
  useEffect(() => {
    const timer = setInterval(() => {
      if (dirtyRef.current) {
        persistRef.current(statusRef.current);
      }
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  /**
   * 对比分析法自动预填：新建 record（字段为空）时，把问题定义中的
   * "目标/期望"填到 normalCase、"问题场景/症状"填到 abnormalCase。
   * 用 ref 防重复执行，且不覆盖用户已填写的内容。
   */
  const prefillRef = useRef(false);
  useEffect(() => {
    if (prefillRef.current || template.id !== 'comparison' || !problem) return;
    prefillRef.current = true;
    const data = (problem.data ?? {}) as Record<string, unknown>;
    const pick = (keys: string[]) => {
      for (const k of keys) {
        const v = data[k];
        if (typeof v === 'string' && v.trim()) return v.trim();
      }
      return '';
    };
    const normal = pick(['gapTarget', 'expectedState', 'problemStatement', 'title']);
    const abnormal = pick(['symptom', 'currentState', 'deviationDetail', 'problemStatement', 'title']);
    const cur = getValues();
    if (normal && (!cur.normalCase || String(cur.normalCase).trim() === '')) {
      setValue('normalCase', normal, { shouldDirty: true });
    }
    if (abnormal && (!cur.abnormalCase || String(cur.abnormalCase).trim() === '')) {
      setValue('abnormalCase', abnormal, { shouldDirty: true });
    }
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

  /** 只校验当前阶段及其之前阶段涉及的 section 的必填项（分阶段逐步校验，不要求后面阶段的字段现在就填）。 */
  function getScopedMissingFields(activeIdx: number) {
    const currentValues = getValues();
    const allMissing = validateRequiredFields(template, currentValues);
    if (!template.phases) return allMissing;
    const accessibleIndices = new Set(template.phases.slice(0, activeIdx + 1).flatMap((p) => p.sectionIndices));
    const accessibleSectionIds = new Set(Array.from(accessibleIndices).map((i) => template.sections[i].id));
    return allMissing.filter((m) => accessibleSectionIds.has(m.sectionId.split('[')[0]));
  }

  /** 切换阶段：先把当前阶段内容保存并 commit（这样新阶段的锁定判断基于最新数据），再切换 Tab。 */
  async function handleSelectPhase(idx: number) {
    await persist(statusRef.current, { commitPhase: true });
    setActivePhaseIndex(idx);
  }

  /** 点击被锁定的阶段：不切换，仅弹 toast 告知用户原因。 */
  function handleLockedClick(_idx: number) {
    showToast('请先完成前面的阶段', 'error');
  }

  /** 主按钮（完成/保存）逻辑：
   * 1. 先校验当前阶段必填项，缺失则列出错误并中断；
   * 2. 若阶段标记 completesRecord（最后一个阶段），校验阶段完成条件；
   * 3. 保存；若是最后阶段则标记为 completed，否则保持当前状态并进入下一阶段。 */
  async function handlePrimaryAction() {
    const missing = getScopedMissingFields(activePhaseIndex);
    if (missing.length > 0) {
      const labels = missing.map((m) => m.label);
      setValidationErrors(labels);
      const MAX_SHOW = 5;
      const shown = labels.slice(0, MAX_SHOW).join('、');
      const suffix = labels.length > MAX_SHOW ? `…等共 ${labels.length} 项` : '';
      showToast(`请完善必填项：${shown}${suffix}`, 'error');
      return;
    }
    const phase = template.phases?.[activePhaseIndex];
    if (phase && !phase.completesRecord) {
      const currentValues = getValues();
      if (!isPhaseCompletionSatisfied(template, phase, currentValues)) {
        setValidationErrors(['当前阶段尚未完成，请继续填写所有必要内容']);
        showToast('当前阶段尚未完成，请继续填写', 'error');
        return;
      }
    }
    setValidationErrors([]);
    const willComplete = !template.phases || phase?.completesRecord;
    const saved = await persist(willComplete ? 'completed' : statusRef.current, { commitPhase: true });
    const ctx = { todayISO, createdAtISO: saved.createdAt };
    const newIdx = template.phases ? getCurrentPhaseIndex(template, getValues(), ctx) : 0;
    setActivePhaseIndex(newIdx);
    showToast(willComplete ? '已保存并标记完成' : '已保存，进入下一阶段', 'success');
  }

  const [copiedJson, setCopiedJson] = useState(false);

  /** 一键复制 JSON：问题详情 + 分析数据 + 根因结论（要因分析法含得分分类与 DEMATEL）。 */
  async function handleCopyJson() {
    const recordForExport: FormRecord = record ?? {
      id: recordIdRef.current ?? 'draft',
      templateId: template.id,
      problemId,
      title: getRecordTitle(template, getValues(), problemTitle),
      data: getValues(),
      status: statusRef.current,
      createdAt: recordCreatedAtRef.current ?? todayISO,
      updatedAt: new Date().toISOString(),
    };
    const json = buildAnalysisExportJson({ problem, record: recordForExport, template, values: getValues() });
    const text = JSON.stringify(json, null, 2);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedJson(true);
    window.setTimeout(() => setCopiedJson(false), 1500);
    showToast('已复制 JSON（问题描述 / 根因 / 果因）', 'success');
  }

  const phases = template.phases;
  const activeSections = phases ? phases[activePhaseIndex].sectionIndices.map((i) => template.sections[i]) : template.sections;
  const isCompleted = statusRef.current === 'completed';
  const disabled = isCompleted || (phases ? phaseLogic.isSectionLocked(activePhaseIndex) || phaseLogic.isSectionReadOnly(activePhaseIndex) : false);
  const activePhase = phases?.[activePhaseIndex];
  const isLastPhase = phases ? activePhaseIndex === phases.length - 1 : true;

  return (
    <RepeatableExpandProvider>
      <FormProvider {...methods}>
        <form onSubmit={(e) => e.preventDefault()} className="print-area animate-fade-in">
        {isCompleted && (
          <div className="mb-5 rounded-xl border border-success/30 bg-success/5 px-5 py-3.5 text-sm font-medium text-success">
            ✓ 本次分析已标记完成，内容为只读状态。
          </div>
        )}
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
        <FormTabs
          sections={activeSections}
          disabled={disabled}
          templateId={template.id}
          historyRecords={historyRecords}
          problem={problem}
          onAutoFilled={() => {
            // 要因分析法：候选 ≤ 15 自动引入填满因素清单后，直接进入关系矩阵阶段。
            // 不走 handleSelectPhase（async persist 中 onFirstSave→navigate 会干扰
            // state 批处理，导致 activePhaseIndex 与 committedValues 不在同一 render
            // 批次生效，关系矩阵阶段被 phaseLogic 判定为 locked→disabled=true）。
            // 修复：先同步更新 committedValues + activePhaseIndex 让 UI 立即可用，
            // 再异步 persist 保存数据（不阻塞 UI 切换）。
            if (activePhaseIndex === 0 && template.phases && template.phases.length > 1) {
              const currentValues = getValues();
              setCommittedValues(currentValues);
              setActivePhaseIndex(1);
              persist(statusRef.current);
            }
          }}
        />
        {/* 可视化面板：实时反映用户填写的字段值（watchedValues 实时更新）。
            "因素清单（factors）"阶段本身是分析对象，不做可视化展示，故跳过。 */}
        {activePhase?.id !== 'factors' && (
          <VisualizationPanel templateId={template.id} values={watchedValues} problemTitle={problemTitle} />
        )}
        {validationErrors.length > 0 && (
          <div className="no-print mt-5 rounded-xl border border-danger/30 bg-danger/5 px-5 py-3.5" role="alert">
            <p className="text-sm font-semibold text-danger">⚠ 以下必填项尚未完成：</p>
            <ul className="mt-2 list-disc pl-5 text-sm text-danger/80">
              {validationErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}
        {!disabled && (
          <div className="no-print mt-8 flex flex-wrap items-center gap-3 border-t border-surface-200 pt-5">
            {phases && activePhaseIndex > 0 && (
              <button
                type="button"
                onClick={() => handleSelectPhase(activePhaseIndex - 1)}
                className="rounded-xl border border-surface-200 bg-surface-0 px-4 py-2.5 text-sm font-medium text-text-secondary transition hover:border-brand-300 hover:text-brand-600"
              >
                ← 上一阶段
              </button>
            )}
            <button
              type="button"
              onClick={handlePrimaryAction}
              className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-200 hover:bg-brand-700 transition"
            >
              {!phases ? '完成' : activePhase?.completesRecord ? '保存并标记完成' : isLastPhase ? '保存' : '保存并进入下一阶段'}
            </button>
            <button
              type="button"
              onClick={handleCopyJson}
              className="rounded-xl border border-surface-200 bg-surface-0 px-4 py-2.5 text-sm font-medium text-text-secondary transition hover:border-brand-300 hover:text-brand-600"
            >
              {copiedJson ? '已复制 JSON ✓' : '复制 JSON'}
            </button>
            <button
              type="button"
              onClick={() => { persist(statusRef.current); showToast('已手动保存', 'success'); }}
              className="rounded-xl border border-surface-200 bg-surface-0 px-4 py-2.5 text-sm font-medium text-text-secondary transition hover:border-brand-300 hover:text-brand-600"
            >
              手动保存
            </button>
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="rounded-xl border border-surface-200 bg-surface-0 px-4 py-2.5 text-sm font-medium text-text-secondary transition hover:border-brand-300 hover:text-brand-600"
            >
              {showHistory ? '隐藏历史' : '版本历史'}
            </button>
            <PdfExportButton
              problem={problem}
              record={{
                id: recordIdRef.current ?? 'draft',
                templateId: template.id,
                problemId,
                title: getRecordTitle(template, getValues(), problemTitle),
                data: getValues(),
                status: statusRef.current,
                createdAt: recordCreatedAtRef.current ?? todayISO,
                updatedAt: new Date().toISOString(),
              }}
              template={template}
              values={getValues()}
            />
            <span className="text-xs text-text-tertiary">
              {lastSavedAt ? `上次保存于 ${format(lastSavedAt, 'HH:mm:ss')}` : '系统每 10 秒自动保存草稿'}
            </span>
          </div>
        )}
        {showHistory && (
          <div className="no-print mt-4">
            <SnapshotList
              snapshots={snapshots}
              loading={snapshotsLoading}
              onRestore={(snapshot) => {
                if (confirm('确定恢复到此快照？当前未保存的内容将被覆盖。')) {
                  // 恢复快照：reset 把表单控件值替换为快照数据，setCommittedValues 同步更新阶段判断用的已确认值
                  reset(snapshot.data);
                  setCommittedValues(snapshot.data);
                  showToast(`已恢复到快照：${snapshot.label}`, 'success');
                }
              }}
              onDelete={(id) => {
                if (confirm('确定删除此快照？')) {
                  removeSnapshot(id);
                }
              }}
              onCreateSnapshot={() => {
                createSnapshot(getValues());
                showToast('已创建快照', 'success');
              }}
            />
          </div>
        )}
      </form>
      <FloatExpandToggleButton />
    </FormProvider>
    </RepeatableExpandProvider>
  );
}
