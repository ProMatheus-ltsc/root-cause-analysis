/**
 * 要因分析法（keyFactor）·手动桥接 AI 一次性填入因果矩阵：
 * 1. 一键生成"问题详情 + 候选原因 + 因素清单"提示词
 * 2. 用户复制给外部 AI，AI 返回 JSON（含所有 cause→effect 对 + strength）
 * 3. 用户粘贴 JSON → 解析校验 → 批量 setValue 到 matrix（同时填入方向+强度）
 * 跳过 105 对逐一手动判断的繁琐流程，作为"快速知道结果"的快捷通道。
 */
import { useEffect, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import type { Problem } from '../../types';
import {
  KEY_FACTOR_MAX,
} from '../../templates/shared';
import {
  buildKeyFactorPrompt,
  formatKeyFactorAnalysis,
  parseKeyFactorAnalysis,
  type KeyFactorAiResult,
} from '../../utils/aiAnalysis';

interface KeyFactorAiPanelProps {
  problem?: Problem;
  disabled?: boolean;
}

type Phase = 'idle' | 'output' | 'error' | 'success';

const EXAMPLE_JSON = '{"causalPairs":[{"cause":"产品部和一线教学团队之间缺乏需求沟通渠道","effect":"产品部内部资料使用率低","strength":4,"reason":"需求断层导致产品部收不到反馈"},{"cause":"内部资料的质量不如广分现成的PPT和讲义","effect":"老师认为广分内容经过市场验证更靠谱","strength":2}]}';

export function KeyFactorAiPanel({ problem, disabled }: KeyFactorAiPanelProps) {
  const { setValue, watch, getValues } = useFormContext();
  const [phase, setPhase] = useState<Phase>('idle');
  const [prompt, setPrompt] = useState('');
  const [aiRaw, setAiRaw] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<KeyFactorAiResult | null>(null);
  const [copied, setCopied] = useState(false);

  // 监听 factors 列表（实时从 form state 读取，确保看到最新）
  const factorsRaw = watch('factors') as Array<Record<string, unknown>> | undefined;
  const factorNames = useMemo(() => {
    if (!Array.isArray(factorsRaw)) return [];
    return factorsRaw
      .slice(0, KEY_FACTOR_MAX)
      .map((f, idx) => (typeof f?.name === 'string' && f.name.trim() ? f.name.trim() : `因素 ${idx + 1}`));
  }, [factorsRaw]);

  const hasFactors = factorNames.length > 0;

  // 页面加载时如果还没有 prompt 且有 factors，自动生成
  useEffect(() => {
    if (phase === 'idle' && !prompt && hasFactors) {
      setPrompt(buildKeyFactorPrompt(problem, factorNames));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFactors]);

  // 已有结果回显（用户刷新过页面）
  useEffect(() => {
    if (phase !== 'idle') return;
    const savedRaw = getValues('keyFactorAiRaw') as string | undefined;
    const savedSummary = getValues('keyFactorAiSummary') as string | undefined;
    if (typeof savedRaw === 'string' && savedRaw.trim() && savedSummary) {
      setAiRaw(savedRaw);
      setResult({ causalPairs: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGenerate() {
    if (!hasFactors) {
      setError('请先在"① 因素清单"阶段添加至少 1 个因素');
      return;
    }
    setPrompt(buildKeyFactorPrompt(problem, factorNames));
    setPhase('output');
    setError('');
  }

  async function handleCopy() {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('复制失败——请手动选择文本复制');
    }
  }

  function handleParse() {
    if (!aiRaw.trim()) {
      setError('粘贴内容为空');
      return;
    }
    if (!hasFactors) {
      setError('请先在"① 因素清单"阶段添加至少 1 个因素');
      return;
    }
    try {
      const parsed = parseKeyFactorAnalysis(aiRaw, factorNames);
      if (parsed.causalPairs.length === 0) {
        setError('AI 未识别到任何因果关系对（causalPairs 为空）。可能所有因素都无关，请换一个 AI 重试。');
        setPhase('error');
        setResult(null);
        return;
      }
      // 批量写入 matrix：cause 行 c_effect 列 = strength；effect 行 c_cause 列 = 0
      const existingMatrix = (getValues('matrix') as Array<Record<string, unknown>> | undefined) ?? [];
      const newMatrix = existingMatrix.map((row) => ({ ...row }));
      while (newMatrix.length < KEY_FACTOR_MAX) {
        const empty: Record<string, number> = {};
        for (let j = 0; j < KEY_FACTOR_MAX; j++) empty[`c${j}`] = 0;
        newMatrix.push(empty);
      }
      parsed.causalPairs.forEach((p) => {
        const ci = factorNames.findIndex((n) => n === p.cause);
        const ei = factorNames.findIndex((n) => n === p.effect);
        if (ci < 0 || ei < 0) return;
        newMatrix[ci][`c${ei}`] = p.strength;
        // 与手动填写一致：强度 2/4（双向关联/互为强因果）同步写反向，保证矩阵对称
        if (p.strength >= 2) {
          newMatrix[ei][`c${ci}`] = p.strength;
        } else {
          newMatrix[ei][`c${ci}`] = 0;
        }
      });
      setValue('matrix', newMatrix, { shouldDirty: true });
      const summary = formatKeyFactorAnalysis(parsed);
      setValue('keyFactorAiSummary', summary, { shouldDirty: true });
      setValue('keyFactorAiRaw', aiRaw.trim(), { shouldDirty: true });
      setResult(parsed);
      setError('');
      setPhase('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase('error');
      setResult(null);
    }
  }

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-indigo-900">🤖 手动调 AI 一次性填入因果关系（快捷通道）</p>
          <p className="mt-1 text-xs text-indigo-700">
            跳过逐对判断 105 次的繁琐流程——AI 一次性给出所有因果方向+影响强度，结果写入下方矩阵。
            因素清单需先填好。
          </p>
        </div>
      </div>

      {phase === 'idle' && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={disabled || !hasFactors}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-40"
          >
            {hasFactors ? '① 生成提示词（问题 + 因素清单）' : '请先填好因素清单'}
          </button>
        </div>
      )}

      {phase === 'output' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-700">① 提示词（复制给外部 AI）：</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="rounded border border-indigo-300 bg-white px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
              >
                {copied ? '✓ 已复制' : '复制提示词'}
              </button>
              <button
                type="button"
                onClick={() => setPhase('idle')}
                className="rounded border border-slate-300 px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100"
              >
                收起
              </button>
            </div>
          </div>
          <textarea
            readOnly
            value={prompt}
            rows={8}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-[11px] text-slate-700"
          />
          <p className="text-xs text-slate-500">
            ② 把提示词发给 AI（ChatGPT/Claude/DeepSeek 等），要求它按格式返回 JSON。
          </p>
          <div>
            <p className="text-xs font-medium text-slate-700 mb-1">③ 粘贴 AI 返回的 JSON：</p>
            <textarea
              value={aiRaw}
              onChange={(e) => setAiRaw(e.target.value)}
              placeholder={EXAMPLE_JSON}
              rows={4}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-[11px]"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={handleParse}
                disabled={disabled || !aiRaw.trim()}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-40"
              >
                解析并填入矩阵 →
              </button>
              <button
                type="button"
                onClick={() => {
                  setAiRaw('');
                  setError('');
                }}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
              >
                清空
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div className="space-y-2">
          <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            <strong>解析失败：</strong> {error}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPhase('output')}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
            >
              返回重新粘贴
            </button>
          </div>
        </div>
      )}

      {phase === 'success' && result && (
        <div className="space-y-2">
          <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            <strong>✓ 成功写入 {result.causalPairs.length} 对因果关系（方向 + 强度）</strong>
            <p className="mt-1">已自动填入下方矩阵，并自动推进到"得分结果"页签。</p>
          </div>
          <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 space-y-0.5 max-h-40 overflow-y-auto">
            {result.causalPairs.map((p, i) => (
              <p key={i}>
                {i + 1}. <strong>{p.cause}</strong> → <strong>{p.effect}</strong>（强度 {p.strength}）{p.reason ? ` — ${p.reason}` : ''}
              </p>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setPhase('output');
              setError('');
            }}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
          >
            重新粘贴 / 继续微调
          </button>
        </div>
      )}
    </div>
  );
}