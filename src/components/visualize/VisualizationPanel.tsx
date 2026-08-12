import { lazy, Suspense, useMemo } from 'react';
import type { TemplateId } from '../../types';
import { parseAiAnalysis } from '../../utils/aiAnalysis';

const MatrixHeatmap = lazy(() => import('./MatrixHeatmap').then((m) => ({ default: m.MatrixHeatmap })));
const FishboneDiagram = lazy(() => import('./FishboneDiagram').then((m) => ({ default: m.FishboneDiagram })));
const CausalGraph = lazy(() => import('./CausalGraph').then((m) => ({ default: m.CausalGraph })));
const TimelineChart = lazy(() => import('./TimelineChart').then((m) => ({ default: m.TimelineChart })));
const LoopDiagram = lazy(() => import('./LoopDiagram').then((m) => ({ default: m.LoopDiagram })));
const WhyLadderChart = lazy(() => import('./WhyLadderChart').then((m) => ({ default: m.WhyLadderChart })));
const ComparisonDiffChart = lazy(() => import('./ComparisonDiffChart').then((m) => ({ default: m.ComparisonDiffChart })));

interface VisualizationPanelProps {
  templateId: TemplateId;
  values: Record<string, unknown>;
  problemTitle?: string;
}

type CausalEntry = { factorA: string; factorB: string; relationType: string; delayEffect?: string; evidence?: string };
type TimelineEntry = {
  time: string;
  eventDesc: string;
  sourceType: string;
  isKeyMoment: boolean;
  actionTaken: string;
  actionCorrectness: string;
};
type WhyEntry = { why: string; evidenceType?: string; evidence?: string; isRootCause?: string };
type ComparisonRow = { dimension?: string; normal?: string; abnormal?: string; diff?: string };

type VisContent =
  | { type: 'heatmap'; factorNames: string[]; matrix: number[][] }
  | { type: 'fishbone'; categories: Array<{ name: string; causes: string[] }>; problemTitle: string }
  | { type: 'causal'; causalChain: CausalEntry[] }
  | { type: 'timeline'; eventSummary: string; entries: TimelineEntry[] }
  | { type: 'loop'; raw: string }
  | { type: 'whyLadder'; problemTitle: string; entries: WhyEntry[] }
  | { type: 'comparison'; normalCase: string; abnormalCase: string; rows: ComparisonRow[] };

export function VisualizationPanel({ templateId, values, problemTitle }: VisualizationPanelProps) {
  const contents = useMemo(() => {
    const list: VisContent[] = [];

    switch (templateId) {
      case 'keyFactor': {
        const factors = values['factors'] as Array<Record<string, unknown>> | undefined;
        const matrixRaw = values['matrix'] as Array<Record<string, unknown>> | undefined;
        if (!factors || factors.length === 0) break;

        const factorNames = factors
          .map((f) => (typeof f?.name === 'string' ? f.name.trim() : ''))
          .filter((n) => n.length > 0);
        const n = factorNames.length;

        // MatrixGuidedInput 存储格式：`rows[i][c${j}] = value`（行对象数组），
        // 兼容两种历史格式：行对象 `{c0, c1, ...}` 与扁平 `{row, col, value}`。
        const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
        if (Array.isArray(matrixRaw)) {
          for (let i = 0; i < matrixRaw.length && i < n; i++) {
            const entry = matrixRaw[i];
            if (!entry || typeof entry !== 'object') continue;
            if (typeof entry.row === 'number' && typeof entry.col === 'number') {
              const v = Number(entry.value);
              if (!isNaN(v) && entry.row < n && entry.col < n) matrix[entry.row][entry.col] = v;
            } else {
              for (let j = 0; j < n; j++) {
                const v = Number(entry[`c${j}`]);
                if (!isNaN(v)) matrix[i][j] = v;
              }
            }
          }
        }

        list.push({ type: 'heatmap', factorNames, matrix });
        break;
      }

      case 'timeline':
      case 'techIncident': {
        const entries = Array.isArray(values.timelineEntries) ? (values.timelineEntries as Array<Record<string, unknown>>) : [];
        const cleaned = entries
          .map((e) => ({
            time: typeof e?.time === 'string' ? e.time : '',
            eventDesc: typeof e?.eventDesc === 'string' ? e.eventDesc : '',
            sourceType: typeof e?.sourceType === 'string' ? e.sourceType : '',
            isKeyMoment: e?.isKeyMoment === true,
            actionTaken: typeof e?.actionTaken === 'string' ? e.actionTaken : '',
            actionCorrectness: typeof e?.actionCorrectness === 'string' ? e.actionCorrectness : '',
          }))
          .filter((e) => e.time || e.eventDesc);
        if (cleaned.length > 0) {
          list.push({
            type: 'timeline',
            eventSummary: typeof values.summary === 'string' ? values.summary : '',
            entries: cleaned,
          });
        }
        break;
      }

      case 'fishbone': {
        const categories: Array<{ name: string; causes: string[] }> = [];
        // 鱼骨图模板实际 section id：人/机/料/法/环/测（man/machine/material/method/environment/measurement）
        const FISHBONE_CATEGORIES = ['man', 'machine', 'material', 'method', 'environment', 'measurement'];
        for (const catId of FISHBONE_CATEGORIES) {
          const catData = values[catId];
          if (Array.isArray(catData)) {
            const causes = catData
              .map((item) => (typeof item?.cause === 'string' ? item.cause.trim() : ''))
              .filter((c) => c.length > 0);
            if (causes.length > 0) {
              const LABEL_MAP: Record<string, string> = {
                man: '人 (Man)', machine: '机 (Machine)', material: '料 (Material)',
                method: '法 (Method)', environment: '环 (Environment)', measurement: '测 (Measurement)',
              };
              categories.push({ name: LABEL_MAP[catId] || catId, causes });
            }
          }
        }
        if (categories.length > 0) {
          list.push({ type: 'fishbone', categories, problemTitle: problemTitle || '问题' });
        }
        break;
      }

      case 'systemThinking': {
        // AI 模式：优先解析 aiAnalysisRaw（回路 + 杠杆点）→ 回路图
        const raw = typeof values['aiAnalysisRaw'] === 'string' ? values['aiAnalysisRaw'] : '';
        if (raw.trim()) {
          try {
            const parsed = parseAiAnalysis(raw);
            if (parsed.loops.length > 0) {
              list.push({ type: 'loop', raw });
            }
          } catch {
            // AI 返回解析失败（面板中已提示），这里静默跳过回路图
          }
        }
        // 手动因果链（可选保留）：有数据则额外展示因果链图
        const causalChain = values['causalChain'] as Array<Record<string, unknown>> | undefined;
        if (Array.isArray(causalChain) && causalChain.length > 0) {
          const entries = causalChain
            .filter((e) => e?.factorA && e?.factorB && e?.relationType)
            .map((e) => ({
              factorA: String(e.factorA),
              factorB: String(e.factorB),
              relationType: String(e.relationType),
              delayEffect: typeof e.delayEffect === 'string' ? e.delayEffect : undefined,
              evidence: typeof e.evidence === 'string' ? e.evidence : undefined,
            }));
          if (entries.length > 0) list.push({ type: 'causal', causalChain: entries });
        }
        break;
      }

      case 'fiveWhy': {
        const entries = Array.isArray(values.whyChain) ? (values.whyChain as Array<Record<string, unknown>>) : [];
        const cleaned: WhyEntry[] = entries
          .filter((e) => typeof e?.why === 'string' && e.why.trim())
          .map((e) => ({
            why: String(e.why),
            evidenceType: typeof e.evidenceType === 'string' ? e.evidenceType : undefined,
            evidence: typeof e.evidence === 'string' ? e.evidence : undefined,
            isRootCause: typeof e.isRootCause === 'string' ? e.isRootCause : undefined,
          }));
        if (cleaned.length > 0) {
          list.push({ type: 'whyLadder', problemTitle: problemTitle || '问题', entries: cleaned });
        }
        break;
      }

      case 'comparison': {
        const rows = Array.isArray(values.comparisonTable) ? (values.comparisonTable as Array<Record<string, unknown>>) : [];
        const cleaned = rows.filter((r) => (typeof r?.normal === 'string' && r.normal.trim()) || (typeof r?.abnormal === 'string' && r.abnormal.trim()));
        if (cleaned.length > 0) {
          list.push({
            type: 'comparison',
            normalCase: typeof values.normalCase === 'string' ? values.normalCase : '',
            abnormalCase: typeof values.abnormalCase === 'string' ? values.abnormalCase : '',
            rows: cleaned,
          });
        }
        break;
      }

      default:
        break;
    }

    return list;
  }, [templateId, values, problemTitle]);

  if (contents.length === 0) return null;

  return (
    <div className="mt-6 space-y-6">
      <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        可视化分析
      </h3>
      <Suspense fallback={<div className="rounded-xl border border-surface-200 bg-surface-50 p-8 text-center text-sm text-text-tertiary animate-pulse">加载可视化组件…</div>}>
        {contents.map((content, idx) => (
          <div key={idx}>
            {content.type === 'heatmap' && (
              <MatrixHeatmap factorNames={content.factorNames} matrix={content.matrix} />
            )}
            {content.type === 'fishbone' && (
              <FishboneDiagram problemTitle={content.problemTitle} categories={content.categories} />
            )}
            {content.type === 'causal' && (
              <CausalGraph causalChain={content.causalChain} />
            )}
            {content.type === 'timeline' && (
              <TimelineChart eventSummary={content.eventSummary} entries={content.entries} />
            )}
            {content.type === 'loop' && (
              <LoopDiagram result={parseAiAnalysis(content.raw)} />
            )}
            {content.type === 'whyLadder' && (
              <WhyLadderChart problemTitle={content.problemTitle} entries={content.entries} />
            )}
            {content.type === 'comparison' && (
              <ComparisonDiffChart normalCase={content.normalCase} abnormalCase={content.abnormalCase} rows={content.rows} />
            )}
          </div>
        ))}
      </Suspense>
    </div>
  );
}
