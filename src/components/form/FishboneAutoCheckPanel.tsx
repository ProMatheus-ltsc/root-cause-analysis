/**
 * 鱼骨图自动勾选助手：
 * - 从问题的头脑风暴候选原因里挑出与当前 check item 相关的项，用户一键勾选
 * - 勾选后自动写入：check item 的 Checked 字段（勾选）+ Detail 字段（追加内容）+ 该维度 cause 数组
 */
import { useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import type { Problem } from '../../types';

interface FishboneAutoCheckPanelProps {
  problem?: Problem;
  /** 当前 section id（如 'man' / 'machine' / ...） */
  sectionId: string;
  disabled?: boolean;
}

interface CheckItem {
  id: string;
  detailId: string;
  label: string;
  keywords: string[];
}

const DIM_CHECK_ITEMS: Record<string, CheckItem[]> = {
  man: [
    { id: 'manSkillGapChecked', detailId: 'manSkillGapDetail', label: '人员技能不足？', keywords: ['技能', '熟练', '经验', '能力', '新人', '讲师'] },
    { id: 'manResponsibilityChecked', detailId: 'manResponsibilityDetail', label: '职责不清？', keywords: ['职责', 'owner', '责任', '边界', '对接', '谁负责'] },
    { id: 'manTrainingChecked', detailId: 'manTrainingDetail', label: '培训缺失？', keywords: ['培训', '学习', '辅导', '不会用', '不熟'] },
  ],
  machine: [
    { id: 'machineFaultChecked', detailId: 'machineFaultDetail', label: '工具/系统是否故障？', keywords: ['故障', '报错', '损坏', '宕机', '超时'] },
    { id: 'machineConfigChecked', detailId: 'machineConfigDetail', label: '环境配置问题？', keywords: ['配置', '环境', '接入', '参数', '对接', '权限'] },
  ],
  material: [
    { id: 'materialQualityChecked', detailId: 'materialQualityDetail', label: '输入数据/物料质量？', keywords: ['质量', '排版', '难度', '素材', '完整', '深度'] },
    { id: 'materialUpstreamChecked', detailId: 'materialUpstreamDetail', label: '上游依赖问题？', keywords: ['上游', '依赖', '资料库', '素材库', '供应'] },
  ],
  method: [
    { id: 'methodMissingChecked', detailId: 'methodMissingDetail', label: '流程/规范缺失？', keywords: ['流程', '规范', '强制', '机制', '考核', '检查'] },
    { id: 'methodWrongChecked', detailId: 'methodWrongDetail', label: '方法论错误？', keywords: ['方法', '策略', '做法', '方式', '理念', '标准化'] },
  ],
  environment: [
    { id: 'envChangeChecked', detailId: 'envChangeDetail', label: '外部环境变化？', keywords: ['外部', '变化', '竞争', '市场', '政策'] },
    { id: 'envPressureChecked', detailId: 'envPressureDetail', label: '时间压力？', keywords: ['时间', '紧迫', '学期', '忙', '来不及'] },
  ],
  measurement: [
    { id: 'measureMissingChecked', detailId: 'measureMissingDetail', label: '监控/度量缺失？', keywords: ['监控', '度量', '考核', '反馈', '检查', '指标'] },
    { id: 'measureDefinitionChecked', detailId: 'measureDefinitionDetail', label: '指标定义不合理？', keywords: ['指标', '定义', '口径', '统计', '计算'] },
  ],
};

interface Candidate {
  idx: number;
  cause: string;
  evidence: string;
  topCheckItem: CheckItem | null;
}

export function FishboneAutoCheckPanel({ problem, sectionId, disabled }: FishboneAutoCheckPanelProps) {
  const { setValue, watch } = useFormContext();
  const [open, setOpen] = useState(true);

  const candidates = useMemo<string[]>(() => {
    const data = (problem?.data ?? {}) as Record<string, unknown>;
    const brainstorm = data['brainstorm'];
    if (!Array.isArray(brainstorm)) return [];
    return brainstorm
      .map((item) => {
        const obj = item as Record<string, unknown>;
        const cause = typeof obj?.cause === 'string' ? obj.cause.trim() : '';
        const evidence = typeof obj?.evidence === 'string' ? obj.evidence.trim() : '';
        return { cause, evidence };
      })
      .filter((b): b is { cause: string; evidence: string } => Boolean(b.cause))
      .map((b) => (b.evidence ? `${b.cause}（${b.evidence}）` : b.cause));
  }, [problem]);

  const checkItems: CheckItem[] = DIM_CHECK_ITEMS[sectionId] ?? [];

  /**
   * 候选原因 → 最佳匹配 check item 的打分逻辑（简单关键词统计，非语义分析）：
   * 1. 对每个候选原因，遍历本维度所有 check item；
   * 2. 每个 check item 预置一组关键词（如"培训/覆盖/讲师"），
   *    统计原因文本里命中了几个关键词，命中数即分数；
   * 3. 取分数最高的 check item 作为"建议归属"，分数为 0 表示没有合适匹配（不显示建议按钮）。
   *
   * 局限：关键词匹配是启发式，可能建议不准——所以 UI 上只是"建议"，
   * 用户仍可自由选择其他 check item 或自己填写，不会强制归属。
   */
  const matched = useMemo<Candidate[]>(() => {
    return candidates.map((cause) => {
      const text = cause.toLowerCase();
      const scores = checkItems.map((ci) => ({
        ...ci,
        // filter().length 即"命中关键词数"；toLowerCase 保证中英文大小写无关匹配
        score: ci.keywords.filter((kw) => text.includes(kw.toLowerCase())).length,
      }));
      const top = scores.sort((a, b) => b.score - a.score)[0]; // 分数最高者胜出
      return {
        idx: 0,
        cause,
        evidence: '',
        topCheckItem: top && top.score > 0 ? top : null,
      };
    });
  }, [candidates, checkItems]);

  if (candidates.length === 0) return null;

  /**
   * 用户确认"此原因属于某 check item"后，一次性做三件事：
   * 1. 勾选该 check item 的 checkbox（ci.id → true）；
   * 2. 把原因文本追加到对应的"详情" textarea（换行累加，保留用户已有内容）；
   * 3. 追加到本维度（sectionId）的发现数组，供鱼骨图可视化和根因结论自动汇总使用。
   * 全部 setValue 都带 shouldDirty，确保触发自动保存。
   */
  function handlePick(candidate: Candidate, ci: CheckItem) {
    const curDetail = (watch(ci.detailId) as string | undefined) ?? '';
    const line = candidate.cause;
    const next = curDetail.trim() ? `${curDetail.trim()}\n${line}` : line;
    setValue(ci.id, true, { shouldDirty: true });
    setValue(ci.detailId, next, { shouldDirty: true });
    const dimArr = (watch(sectionId) as Array<Record<string, unknown>> | undefined) ?? [];
    const newArr = [...dimArr, { cause: candidate.cause, evidence: candidate.evidence }];
    setValue(sectionId, newArr, { shouldDirty: true });
  }

  return (
    <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50/70 p-3 text-xs leading-relaxed">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-semibold text-emerald-800">✨ 自动勾选候选（来自问题头脑风暴，关键词匹配）</p>
        <button type="button" onClick={() => setOpen(!open)} className="text-emerald-700 hover:underline">
          {open ? '收起' : '展开'}
        </button>
      </div>
      {open && (
        <ul className="space-y-1.5">
          {matched.map((m, i) => (
            <li key={i} className="rounded border border-emerald-100 bg-white/70 px-2.5 py-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 break-words text-slate-700">{m.cause}</p>
                {m.topCheckItem ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => handlePick(m, m.topCheckItem!)}
                    className="shrink-0 rounded border border-emerald-300 bg-white px-2 py-0.5 text-emerald-700 hover:bg-emerald-100"
                    title={`自动勾选"${m.topCheckItem.label}"并写入详情`}
                  >
                    → {m.topCheckItem.label}
                  </button>
                ) : (
                  <span className="shrink-0 text-slate-400 text-[10px]">无匹配</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}