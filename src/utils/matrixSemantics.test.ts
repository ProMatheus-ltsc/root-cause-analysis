import { describe, expect, it } from 'vitest';
import {
  computeKeyFactors,
  normalizeKeyFactorMatrix,
  KEY_FACTOR_MAX,
} from '../templates/shared';

/**
 * 关系矩阵语义测试（2026-08-18 修复回归）：
 * 1. 影响强度档位 1 弱 / 2 中 / 4 强 可正常填写（不覆盖方向标记）；
 * 2. 填强度只写正向（因→果），不写反向 —— 方向判定不被破坏，根因/过因/表因得分正确；
 * 3. 历史数据"双向污染"（旧版填 2/4 时同步写反向）读取时归一化为单向。
 */

const mkRow = (vals: Record<number, number> = {}) =>
  Object.fromEntries(Array.from({ length: KEY_FACTOR_MAX }, (_, k) => ['c' + k, vals[k] ?? 0]));

describe('keyFactor 矩阵语义（0.5 方向标记 + 1/2/4 强度）', () => {
  it('方向标记 0.5 计入方向但不等于已填强度，定位得分正确', () => {
    // A→B(0.5 未填强度) B→C(2 中) C→D(4 强) A→D(1 弱) A→E(0.5) E→D(0.5)
    const matrix = [
      mkRow({ 1: 0.5, 3: 1, 4: 0.5 }),
      mkRow({ 2: 2 }),
      mkRow({ 3: 4 }),
      mkRow({}),
      mkRow({ 3: 0.5 }),
    ];
    const factors = [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }, { name: 'E' }];
    const res = computeKeyFactors({ factors, matrix });
    const byName = Object.fromEntries(res.map((r) => [r.name, r]));

    // A 影响 B、D、E（3 个），不被影响 → score=-3 < -2 → 根因
    expect(byName['A'].outCount).toBe(3);
    expect(byName['A'].inCount).toBe(0);
    expect(byName['A'].roleLabel).toBe('根因');
    // 方向标记 0.5 的加权低于明确强度 1（A 的对外影响总量 = 0.5 + 1 + 0.5）
    expect(byName['A'].outDegree).toBe(2);

    // B 影响 C、被 A 影响 → 过因
    expect(byName['B'].roleLabel).toBe('过因');
    // C 影响 D、被 B 影响 → 过因
    expect(byName['C'].roleLabel).toBe('过因');
    // D 被 C(4)、A(1)、E(0.5) 影响，不影响别人 → score=3 > 2 → 表因
    expect(byName['D'].inCount).toBe(3);
    expect(byName['D'].roleLabel).toBe('表因');
  });

  it('强度 1 弱可以填写且与方向标记（0.5）可区分', () => {
    const matrix = [mkRow({ 1: 1 }), mkRow({}), mkRow({})];
    const res = computeKeyFactors({ factors: [{ name: 'A' }, { name: 'B' }, { name: 'C' }], matrix });
    const a = res.find((r) => r.name === 'A')!;
    // 强度 1 是明确的弱关联（outDegree 计入 1，而非 0.5）
    expect(a.outDegree).toBe(1);
  });
});

describe('normalizeKeyFactorMatrix 历史数据归一化', () => {
  it('双向污染收敛为单向，保留较大强度', () => {
    const polluted = [
      mkRow({ 1: 2, 3: 1 }), // A→B(2)、A→D(1)
      mkRow({ 0: 2 }), // B→A(2) —— 与 A→B 双向污染（相等）
      mkRow({ 3: 4 }), // C→D(4)
      mkRow({ 2: 4 }), // D→C(4) —— 与 C→D 双向污染（相等，保留 C→D）
      mkRow({}),
    ];
    const norm = normalizeKeyFactorMatrix(polluted);
    // A↔B：相等保留 i→j（A→B），清除 B→A
    expect(norm[0]['c1']).toBe(2);
    expect(norm[1]['c0']).toBe(0);
    // C↔D：C→D 与 D→C 相等，保留 C→D，清除 D→C
    expect(norm[2]['c3']).toBe(4);
    expect(norm[3]['c2']).toBe(0);
    // 单向正常数据不受影响
    expect(norm[0]['c3']).toBe(1);
  });

  it('较大方向不同时保留较大者', () => {
    const polluted = [mkRow({ 1: 2 }), mkRow({ 0: 4 }), mkRow({})];
    const norm = normalizeKeyFactorMatrix(polluted);
    // B→A(4) 大于 A→B(2) → 保留 B→A
    expect(norm[1]['c0']).toBe(4);
    expect(norm[0]['c1']).toBe(0);
  });

  it('幂等：重复归一化结果不变', () => {
    const polluted = [mkRow({ 1: 2, 2: 4 }), mkRow({ 0: 2 }), mkRow({ 1: 4 })];
    const once = normalizeKeyFactorMatrix(polluted);
    const twice = normalizeKeyFactorMatrix(once);
    expect(twice).toEqual(once);
  });

  it('补齐缺失行到 15 行全 0', () => {
    const norm = normalizeKeyFactorMatrix([mkRow({ 1: 2 })]);
    expect(norm.length).toBe(KEY_FACTOR_MAX);
    expect(norm[KEY_FACTOR_MAX - 1]['c0']).toBe(0);
  });
});
