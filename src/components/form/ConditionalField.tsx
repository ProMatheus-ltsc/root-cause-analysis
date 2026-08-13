/**
 * 条件字段包装：根据 condition.dependsOn 指定的"其他字段"当前值，决定是否渲染 children。
 * 核心概念：
 * - 通过 useFormContext().watch 实时监听"被依赖字段"的值，被依赖值一变本组件立即重新渲染，
 *   从而实现"选了某选项才出现后续字段"的动态表单效果。
 * - 重要坑：React 要求 Hooks 必须在每次渲染中按相同顺序、无条件调用（Hooks 调用规则）。
 *   因此即使没有 condition，也必须在组件顶层调用 watch（传入占位路径 '__unused__'），
 *   而不能写成 if (condition) { const v = watch(...) } —— 否则 Hook 调用次数会不一致。
 */
import type { ReactNode } from 'react';
import { useFormContext } from 'react-hook-form';
import type { FieldCondition } from '../../types';

/**
 * 判断"被依赖字段的当前值"value 是否命中 showWhen 配置。
 * - showWhen 可能是单个值或数组：数组表示"命中其中任意一个即可"；
 * - 当 value 本身是数组（如多选 checkbox 存的是字符串数组）时，
 *   只要数组里任一元素命中就算满足条件。
 */
function matchesCondition(value: unknown, showWhen: string | string[]): boolean {
  const targets = Array.isArray(showWhen) ? showWhen : [showWhen];
  if (Array.isArray(value)) return value.some((v) => targets.includes(String(v)));
  return targets.includes(String(value));
}

/**
 * 条件字段容器组件：包裹任意 children（通常是某个字段的输入区）。
 * - condition：条件配置。dependsOn 指明要监听哪个"兄弟字段"，showWhen 列出命中值；
 *   不传 condition 则始终展示 children（即无条件字段）。
 * - basePath：被依赖字段在表单值树中的路径前缀（例如 'sectionId.' 或 'repeatId.0.'）。
 * - children：条件命中时才渲染的内容。
 * 注意：返回 null 隐藏时，该 children 内部的输入控件会从表单上"卸载"，
 * 其已有值仍保留在 React Hook Form 的值树里，重新出现时会回填。
 */
export function ConditionalField({
  condition,
  basePath,
  children,
}: {
  condition?: FieldCondition;
  basePath: string;
  children: ReactNode;
}) {
  const { watch } = useFormContext();
  // 无条件也调用 watch（传占位路径），保证 Hooks 调用数量稳定，符合 Hooks 规则
  const watchedValue = watch(condition ? `${basePath}${condition.dependsOn}` : '__unused__');
  if (!condition) return <>{children}</>; // 无条件配置：始终展示
  if (!matchesCondition(watchedValue, condition.showWhen)) return null; // 未命中：隐藏
  return <>{children}</>; // 命中条件：正常展示
}
