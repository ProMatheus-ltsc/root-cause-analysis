/**
 * 条件字段包装：根据 condition.dependsOn 字段当前值判断是否展示 children。
 * watch 无条件调用（传入占位路径），避免破坏 Hooks 调用规则。
 */
import type { ReactNode } from 'react';
import { useFormContext } from 'react-hook-form';
import type { FieldCondition } from '../../types';

function matchesCondition(value: unknown, showWhen: string | string[]): boolean {
  const targets = Array.isArray(showWhen) ? showWhen : [showWhen];
  if (Array.isArray(value)) return value.some((v) => targets.includes(String(v)));
  return targets.includes(String(value));
}

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
  const watchedValue = watch(condition ? `${basePath}${condition.dependsOn}` : '__unused__');
  if (!condition) return <>{children}</>;
  if (!matchesCondition(watchedValue, condition.showWhen)) return null;
  return <>{children}</>;
}
