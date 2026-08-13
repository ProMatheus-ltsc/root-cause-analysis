/**
 * 可视化面板（VisualizationPanel）：根据 templateId（分析模板类型）和用户在表单中填写的 values，
 * 把数据清洗/转换为各图表组件所需的 props，然后按顺序渲染对应可视化组件。
 * - 输入数据形态：templateId 决定走哪个转换分支；values 是表单原始数据（结构因模板而异）；
 *   problemTitle 是问题标题（鱼骨图、5Why 图需要显示）。
 * - 职责边界：本文件不做任何绘制，只做"数据形态转换 + 组件路由"；真正的画图在各子组件里。
 * - 组件用 lazy 懒加载 + Suspense：只有需要展示时才下载对应图表的代码，减小首屏体积。
 */
import { lazy, Suspense, useMemo } from 'react';
import type { TemplateId } from '../../types';
import { parseAiAnalysis } from '../../utils/aiAnalysis';

// 懒加载各图表组件：lazy + .then 把"具名导出"转成 React.lazy 需要的"default 导出"。
// 下面的 7 个组件模式完全一致：按需加载对应图表模块。
const MatrixHeatmap = lazy(() => import('./MatrixHeatmap').then((m) => ({ default: m.MatrixHeatmap })));
const FishboneDiagram = lazy(() => import('./FishboneDiagram').then((m) => ({ default: m.FishboneDiagram })));
const CausalGraph = lazy(() => import('./CausalGraph').then((m) => ({ default: m.CausalGraph })));
const TimelineChart = lazy(() => import('./TimelineChart').then((m) => ({ default: m.TimelineChart })));
const LoopDiagram = lazy(() => import('./LoopDiagram').then((m) => ({ default: m.LoopDiagram })));
const WhyLadderChart = lazy(() => import('./WhyLadderChart').then((m) => ({ default: m.WhyLadderChart })));
const ComparisonDiffChart = lazy(() => import('./ComparisonDiffChart').then((m) => ({ default: m.ComparisonDiffChart })));

/**
 * 可视化面板 props：
 * - templateId：当前分析模板（决定展示哪些图表、如何解析 values）
 * - values：表单原始数据，键值因模板而异（见下方各 case 的解析逻辑）
 * - problemTitle：问题标题，部分图表（鱼骨图、5Why 阶梯图）需要显示
 */
interface VisualizationPanelProps {
  templateId: TemplateId;
  values: Record<string, unknown>;
  problemTitle?: string;
}

// ---- 各模板数据的内部类型（比 values 的 unknown 更具体，让转换过程有类型保障）----
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

/**
 * 转换结果的可辨识联合类型（discriminated union）：type 字段区分 7 种可视化内容，
 * 其余字段是该图表需要的输入数据。contents 数组按顺序渲染，
 * 多个图表可以同时出现（如 systemThinking 模板的"回路图 + 因果链图"）。
 */
type VisContent =
  | { type: 'heatmap'; factorNames: string[]; matrix: number[][] }
  | { type: 'fishbone'; categories: Array<{ name: string; causes: string[] }>; problemTitle: string }
  | { type: 'causal'; causalChain: CausalEntry[] }
  | { type: 'timeline'; eventSummary: string; entries: TimelineEntry[] }
  | { type: 'loop'; raw: string }
  | { type: 'whyLadder'; problemTitle: string; entries: WhyEntry[] }
  | { type: 'comparison'; normalCase: string; abnormalCase: string; rows: ComparisonRow[] };

/**
 * 可视化面板组件：useMemo 中按 templateId 分支把 values 清洗成 VisContent 列表；
 * 渲染时用 Suspense 包裹（加载中显示脉冲占位），contents.map 按 type 分发到对应图表组件。
 */
export function VisualizationPanel({ templateId, values, problemTitle }: VisualizationPanelProps) {
  const contents = useMemo(() => {
    const list: VisContent[] = [];

    switch (templateId) {
      // ---- keyFactor（关键因素）模板：解析因素名 + 因果强度矩阵 → 热力图 ----
      case 'keyFactor': {
        const factors = values['factors'] as Array<Record<string, unknown>> | undefined;
        const matrixRaw = values['matrix'] as Array<Record<string, unknown>> | undefined;
        if (!factors || factors.length === 0) break;

        const factorNames = factors
          .map((f) => (typeof f?.name === 'string' ? f.name.trim() : ''))
          .filter((n) => n.length > 0);
        const n = factorNames.length;

        // 矩阵转换：先把因素名提取出来并去空串，n 为因素个数。
        // MatrixGuidedInput 存储格式：`rows[i][c${j}] = value`（行对象数组），
        // 兼容两种历史格式：行对象 `{c0, c1, ...}` 与扁平 `{row, col, value}`。
        const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
        if (Array.isArray(matrixRaw)) {
          for (let i = 0; i < matrixRaw.length && i < n; i++) {
            const entry = matrixRaw[i];
            if (!entry || typeof entry !== 'object') continue;
            // 扁平格式：entry.row / entry.col 直接给出坐标，写入 matrix[row][col]（先校验下标不越界）
            if (typeof entry.row === 'number' && typeof entry.col === 'number') {
              const v = Number(entry.value);
              if (!isNaN(v) && entry.row < n && entry.col < n) matrix[entry.row][entry.col] = v;
            } else {
              // 行对象格式：entry["c0"]、entry["c1"]… 对应第 i 行的各列，逐个取数字写入
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

      // ---- timeline / techIncident（时间线 / 技术事故）模板：清洗事件条目 → 时间线图 ----
      // 每项只保留需要的字段并统一转成字符串，再过滤掉既无时间也无描述的无效条目。
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

      // ---- fishbone（鱼骨图）模板：收集 6 大分类（人/机/料/法/环/测）下填写的原因 → 鱼骨图 ----
      // 模板表单里每个分类是一个数组（存于 values[catId]），每项取 .cause 文本；
      // 空分类跳过，非空分类再映射成中文名（人 Man / 机 Machine / …）。
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

      // ---- systemThinking（系统思考）模板：优先展示 AI 回路图，手动因果链作为补充 ----
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

      // ---- fiveWhy（5Why 追问）模板：清洗 whyChain 追问链 → 阶梯图 ----
      // 只保留 why 非空的层级，并把 evidenceType / evidence / isRootCause 原样透传。
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

      // ---- comparison（对比分析）模板：清洗 comparisonTable 各行 → 对比差异图 ----
      // 只保留"正常或异常描述至少有一项非空"的行，摘要字段原样透传。
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

  // 没有任何可展示的可视化内容时直接不渲染（返回 null，父级留白）
  if (contents.length === 0) return null;

  // ---- 渲染层 ----
  // 标题行带一个小图标；Suspense 包裹各图表（懒加载期间显示脉冲占位）；
  // contents.map 按 content.type 分发到对应组件——这里只做"接线"，数据在 useMemo 里已转换好。
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
