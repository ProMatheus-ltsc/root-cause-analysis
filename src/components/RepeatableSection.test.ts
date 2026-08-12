/**
 * 相似原因检测纯函数测试：验证 textSimilarity 与 computeSimilarPairs 的
 * 判定质量——完全重复、改写近义、无关文本三类场景。
 */
import { describe, expect, it } from 'vitest';
import { SIMILARITY_THRESHOLD, computeSimilarPairs, textSimilarity } from './RepeatableSection';

describe('textSimilarity', () => {
  it('完全相同的文本相似度为 1', () => {
    expect(textSimilarity('产品部内部资料覆盖度不足', '产品部内部资料覆盖度不足')).toBe(1);
  });

  it('空文本相似度为 0', () => {
    expect(textSimilarity('', '产品部内部资料覆盖度不足')).toBe(0);
    expect(textSimilarity('   ', '')).toBe(0);
  });

  it('无关文本相似度低于阈值', () => {
    const s = textSimilarity('产品部内部资料覆盖度不足，九年级物理知识点没有完整对应的内部素材', '客户投诉渠道不畅，客服响应时间过长，需要优化排班');
    expect(s).toBeLessThan(SIMILARITY_THRESHOLD);
  });

  it('改写近义句相似度高于阈值（换说法但意思相近）', () => {
    const a = '产品部内部资料覆盖不足，缺少九年级物理的完整素材';
    const b = '产品部内部资料不全，九年级物理素材缺失';
    const s = textSimilarity(a, b);
    expect(s).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD);
  });

  it('忽略首尾/中间空白差异', () => {
    const s = textSimilarity(' 资料 不足 ', '资料不足');
    expect(s).toBe(1);
  });
});

describe('computeSimilarPairs', () => {
  const fields = ['name', 'description'];

  it('两两检出相似原因，且互为镜像', () => {
    const entries = [
      { name: '上游依赖频繁变更，稳定性差，导致下游报错', description: '' },
      { name: '上游依赖频繁变更、稳定性差，导致下游系统报错', description: '' },
      { name: '完全无关的另一个原因描述', description: '' },
    ];
    const pairs = computeSimilarPairs(entries, fields[0]);
    expect(pairs.get(0)?.map((p) => p.idx)).toEqual([1]);
    expect(pairs.get(1)?.map((p) => p.idx)).toEqual([0]);
    expect(pairs.has(2)).toBe(false);
  });

  it('空条目与只有一条有效时不产生相似对', () => {
    const pairs1 = computeSimilarPairs([{ name: '', description: '' }, { name: 'a', description: '' }], fields[0]);
    expect(pairs1.size).toBe(0);

    const pairs2 = computeSimilarPairs([{ name: '只有一条原因', description: '' }], fields[0]);
    expect(pairs2.size).toBe(0);
  });

  it('按相似度降序排列', () => {
    const entries = [
      { name: 'A原因：系统超时导致订单创建失败', description: '' },
      { name: 'B原因：系统超时导致订单创建失败', description: '' },
      { name: 'A原因：系统超时导致订单创建失败', description: '' },
    ];
    const pairs = computeSimilarPairs(entries, fields[0]);
    const list = pairs.get(0)!;
    // 与 idx=2 完全相同(1.0) 应排在 idx=1 的近似(0.55~0.99) 之前
    expect(list[0].idx).toBe(2);
    expect(list[0].score).toBe(1);
  });
});
