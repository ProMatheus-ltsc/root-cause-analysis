import { lazy, Suspense, useMemo } from 'react';
import type { TemplateId } from '../../types';

const MatrixHeatmap = lazy(() => import('./MatrixHeatmap').then((m) => ({ default: m.MatrixHeatmap })));
const FishboneDiagram = lazy(() => import('./FishboneDiagram').then((m) => ({ default: m.FishboneDiagram })));
const CausalGraph = lazy(() => import('./CausalGraph').then((m) => ({ default: m.CausalGraph })));

interface VisualizationPanelProps {
  templateId: TemplateId;
  values: Record<string, unknown>;
  problemTitle?: string;
}

export function VisualizationPanel({ templateId, values, problemTitle }: VisualizationPanelProps) {
  const content = useMemo(() => {
    switch (templateId) {
      case 'keyFactor': {
        const factors = values['factors'] as Array<Record<string, unknown>> | undefined;
        const matrixRaw = values['matrix'] as Array<Record<string, unknown>> | undefined;
        if (!factors || factors.length === 0) return null;

        const factorNames = factors
          .map((f) => (typeof f?.name === 'string' ? f.name.trim() : ''))
          .filter((n) => n.length > 0);
        const n = factorNames.length;

        const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
        if (Array.isArray(matrixRaw)) {
          for (const entry of matrixRaw) {
            const i = Number(entry?.row);
            const j = Number(entry?.col);
            const v = Number(entry?.value);
            if (!isNaN(i) && !isNaN(j) && !isNaN(v) && i < n && j < n) {
              matrix[i][j] = v;
            }
          }
        }

        return { type: 'heatmap' as const, factorNames, matrix };
      }

      case 'fishbone': {
        const categories: Array<{ name: string; causes: string[] }> = [];
        const FISHBONE_CATEGORIES = ['people', 'process', 'equipment', 'material', 'environment', 'measurement'];
        for (const catId of FISHBONE_CATEGORIES) {
          const catData = values[catId];
          if (Array.isArray(catData)) {
            const causes = catData
              .map((item) => (typeof item?.cause === 'string' ? item.cause.trim() : ''))
              .filter((c) => c.length > 0);
            if (causes.length > 0) {
              const LABEL_MAP: Record<string, string> = {
                people: '人员', process: '流程', equipment: '设备',
                material: '材料', environment: '环境', measurement: '测量',
              };
              categories.push({ name: LABEL_MAP[catId] || catId, causes });
            }
          }
        }
        if (categories.length === 0) return null;
        return { type: 'fishbone' as const, categories, problemTitle: problemTitle || '问题' };
      }

      case 'systemThinking': {
        const causalChain = values['causalChain'] as Array<Record<string, unknown>> | undefined;
        if (!Array.isArray(causalChain) || causalChain.length === 0) return null;
        const entries = causalChain
          .filter((e) => e?.factorA && e?.factorB && e?.relationType)
          .map((e) => ({
            factorA: String(e.factorA),
            factorB: String(e.factorB),
            relationType: String(e.relationType),
            delayEffect: typeof e.delayEffect === 'string' ? e.delayEffect : undefined,
            evidence: typeof e.evidence === 'string' ? e.evidence : undefined,
          }));
        if (entries.length === 0) return null;
        return { type: 'causal' as const, causalChain: entries };
      }

      default:
        return null;
    }
  }, [templateId, values, problemTitle]);

  if (!content) return null;

  return (
    <div className="mt-6 space-y-4">
      <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        可视化分析
      </h3>
      <Suspense fallback={<div className="rounded-xl border border-surface-200 bg-surface-50 p-8 text-center text-sm text-text-tertiary animate-pulse">加载可视化组件…</div>}>
        {content.type === 'heatmap' && (
          <MatrixHeatmap factorNames={content.factorNames} matrix={content.matrix} />
        )}
        {content.type === 'fishbone' && (
          <FishboneDiagram problemTitle={content.problemTitle} categories={content.categories} />
        )}
        {content.type === 'causal' && (
          <CausalGraph causalChain={content.causalChain} />
        )}
      </Suspense>
    </div>
  );
}
