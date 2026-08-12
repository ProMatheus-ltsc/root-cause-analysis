/**
 * 系统思考·手动桥接 AI 分析面板：
 * 1. 一键生成"问题详情 + 候选原因"的 JSON 与提示词（复制给外部 AI）
 * 2. 用户粘贴 AI 返回的 JSON → 解析校验 → 展示回路与杠杆点
 * 3. 解析结果写入表单字段（aiLoopsText / aiLeverageText / aiAnalysisRaw）
 * 未接入 AI 时，这是"手动调 AI"的分析模式。
 */
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import type { Problem } from '../../types';
import { buildSystemThinkPrompt, formatAiAnalysis, parseAiAnalysis, type AiAnalysisResult } from '../../utils/aiAnalysis';

interface SystemThinkAiPanelProps {
  problem?: Problem;
  disabled?: boolean;
}

type Phase = 'idle' | 'output' | 'error' | 'success';

export function SystemThinkAiPanel({ problem, disabled }: SystemThinkAiPanelProps) {
  const { setValue, getValues } = useFormContext();
  const [phase, setPhase] = useState<Phase>('idle');
  const [prompt, setPrompt] = useState('');
  const [aiRaw, setAiRaw] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<AiAnalysisResult | null>(null);
  const [copied, setCopied] = useState(false);

  const hasProblem = !!problem;

  function handleGenerate() {
    setPrompt(buildSystemThinkPrompt(problem));
    setPhase('output');
    setError('');
  }

  async function handleCopyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 非安全上下文降级：提示手动选中复制
      setError('复制失败：请手动选中上方内容复制');
    }
  }

  function handleParse() {
    try {
      const parsed = parseAiAnalysis(aiRaw);
      if (parsed.loops.length === 0) {
        setError('AI 未识别到任何反馈回路。可尝试：① 补充候选原因后重新导出；② 在提示词里补充系统背景；③ 换一个 AI 重试。');
        setPhase('error');
        setResult(null);
        return;
      }
      setResult(parsed);
      setError('');
      setPhase('success');
      // 写入表单字段，供后续阶段/导出使用
      const text = formatAiAnalysis(parsed);
      setValue('aiLoopsText', text, { shouldDirty: true });
      setValue('aiLeverageText', text, { shouldDirty: true });
      setValue('aiAnalysisRaw', aiRaw.trim(), { shouldDirty: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase('error');
      setResult(null);
    }
  }

  // 已保存过的结果回显（如果用户刷新过页面）
  const savedRaw = getValues('aiAnalysisRaw');
  const showSaved = phase === 'idle' && typeof savedRaw === 'string' && savedRaw.trim();

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50/50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-sky-900">🧠 手动调 AI 分析回路与杠杆点</p>
        <span className="text-[10px] rounded bg-sky-100 px-1.5 py-0.5 text-sky-700">外部 AI 桥接</span>
      </div>
      <ol className="list-decimal space-y-1 pl-5 text-xs text-sky-800 leading-relaxed">
        <li>点下方"生成导出内容"，把提示词+问题 JSON 复制给任意 AI（要求返回 JSON）</li>
        <li>把 AI 返回的 JSON 粘贴到下方输入框</li>
        <li>点"解析并应用"——格式正确则生成回路与杠杆点，错误则提示原因</li>
      </ol>

      {!hasProblem && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          当前未关联问题（可能是新建记录）。建议关联问题后再做系统思考分析，导出的内容会更完整。
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={handleGenerate}
          className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-sky-700 disabled:opacity-40"
        >
          生成导出内容（提示词 + 问题 JSON）
        </button>
        {phase === 'output' && (
          <button
            type="button"
            onClick={handleCopyPrompt}
            className="rounded-md border border-sky-300 bg-white px-3 py-1.5 text-xs font-medium text-sky-700 transition hover:bg-sky-100"
          >
            {copied ? '已复制 ✓' : '复制提示词'}
          </button>
        )}
      </div>

      {phase === 'output' && (
        <textarea
          readOnly
          value={prompt}
          rows={12}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-700"
          onFocus={(e) => e.target.select()}
        />
      )}

      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-600">粘贴 AI 返回的 JSON：</p>
        <textarea
          value={aiRaw}
          onChange={(e) => setAiRaw(e.target.value)}
          rows={8}
          disabled={disabled}
          placeholder='{"loops": [{"name": "回路名", "type": "reinforcing", "causes": ["环节1","环节2","环节3"]}], "leveragePoints": [{"cause": "杠杆点", "intervention": "干预", "reason": "依据"}]}'
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-700"
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={disabled || !aiRaw.trim()}
            onClick={handleParse}
            className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-sky-700 disabled:opacity-40"
          >
            解析并应用
          </button>
          {phase === 'error' && <span className="text-xs text-rose-600">✗ 解析失败</span>}
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-relaxed text-rose-700">⚠ {error}</p>
      )}

      {result && result.loops.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-sky-900">解析结果（已写入表单）：</p>
          {result.loops.map((l, i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-800">{i + 1}. {l.name}</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    l.type === 'reinforcing'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {l.type === 'reinforcing' ? '恶性循环/正反馈' : '平衡环/负反馈'}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600">链路：{l.causes.join(' → ')}</p>
              {l.description && <p className="mt-1 text-xs text-slate-500">{l.description}</p>}
            </div>
          ))}
          {result.leveragePoints.length > 0 && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
              <p className="text-xs font-semibold text-emerald-800">🎯 杠杆点：</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-emerald-900">
                {result.leveragePoints.map((p, i) => (
                  <li key={i}>
                    <span className="font-medium">{p.cause}</span>
                    {p.intervention && <span className="text-emerald-700"> — 干预：{p.intervention}</span>}
                    {p.reason && <span className="text-emerald-600">（{p.reason}）</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {showSaved && !result && (
        <p className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
          已保存过分析结果（刷新前）。可重新粘贴 JSON 覆盖，或到"杠杆点"字段查看文本版本。
        </p>
      )}
    </div>
  );
}
