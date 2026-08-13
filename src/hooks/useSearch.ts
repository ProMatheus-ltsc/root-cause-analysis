/**
 * 问题搜索 hook：基于 flexsearch 全文索引，对问题标题 + 描述做快速搜索。
 *
 * 扮演的角色：问题列表页的搜索能力。把全量 problems 建成内存索引，
 * 用户输入关键词时用索引搜索，返回 id 集合，再映射回原始问题数组。
 *
 * 核心概念（初学者向）：
 *   flexsearch 是一个"全文检索引擎"：先对所有文本建立倒排索引（像字典的索引页），
 *   搜索时不必逐条用 includes 遍历，速度远快于线性扫描，尤其适合数据量大的情况。
 *   useRef 保存索引对象：它跨渲染存活但不会触发重渲染，适合存这类"实例"。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Index as FlexSearchIndex } from 'flexsearch';
import type { Problem } from '../types';

/** 参与索引的文档结构：只索引标题和描述，不索引 data 字段（减少索引体积） */
interface SearchableDoc {
  /** 问题 id，用于把搜索结果映射回原始问题 */
  id: string;
  /** 问题标题 */
  title: string;
  /** 问题描述 */
  statement: string;
}

/**
 * 搜索问题列表。
 * @param problems 全量问题列表
 * @param query 用户输入的关键词
 * @returns 过滤后的问题数组；query 为空时返回原列表
 *
 * 工作流程拆成三步（两个 useEffect + 一个 useMemo）：
 *   1. problems 变化时重建索引（useEffect 1）；
 *   2. query 变化时用索引搜索，得到命中 id 集合（useEffect 2）；
 *   3. 用 id 集合过滤原始数组（useMemo）。
 */
export function useSearchProblems(problems: Problem[], query: string) {
  // 保存索引实例与文档映射，跨渲染共享但不触发重渲染
  const indexRef = useRef<FlexSearchIndex | null>(null);
  const docsRef = useRef<Map<string, SearchableDoc>>(new Map());
  // 搜索结果 id 集合；null 表示"无搜索词"，应返回全部
  const [resultIds, setResultIds] = useState<Set<string> | null>(null);

  // 第一个 useEffect：只要 problems 变化，就重建一份新索引（旧索引作废）。
  // 因为索引与数据强相关，数据一变动索引就必须同步重建，所以依赖 [problems]。
  useEffect(() => {
    // 新建 flexsearch 索引：tokenize: 'forward' 表示按"前缀"切词（能匹配"根因"→"根因分析"），
    // resolution: 9 是文档与词的匹配精度（值越大匹配越精确，范围 1-9）
    const idx = new FlexSearchIndex({
      tokenize: 'forward',
      resolution: 9,
    });
    const docs = new Map<string, SearchableDoc>();

    // 遍历每个问题：把它加入文档映射，并把"标题 + 描述"作为可搜索文本加入索引
    for (const p of problems) {
      const doc: SearchableDoc = {
        id: p.id,
        title: p.title,
        statement: p.problemStatement || '',
      };
      docs.set(p.id, doc);
      // 索引的 add 要求 id 是 number 类型，这里先把 string id 转成 number 再存
      idx.add(p.id as unknown as number, `${doc.title} ${doc.statement}`);
    }

    // 把新索引存入 ref，供第二个 useEffect 搜索使用
    indexRef.current = idx;
    docsRef.current = docs;
  }, [problems]);

  // 第二个 useEffect：query 变化时执行搜索。
  // 注意：这里不监听 problems，因为 problems 变了会重建索引（第一个 useEffect），
  // 而搜索词没变时结果应该重新计算——不过此处依赖只有 [query]，
  // 是刻意设计：只要关键词没变，就沿用上一次的搜索结果，直到用户再次输入。
  useEffect(() => {
    // 搜索词为空（或全是空白）时，清空结果集表示"不过滤"
    if (!query.trim()) {
      setResultIds(null);
      return;
    }
    const idx = indexRef.current;
    // 索引还没建好（数据尚未加载）时同样不过滤
    if (!idx) {
      setResultIds(null);
      return;
    }
    // 执行搜索：limit: 100 限制最多返回 100 条，防止结果集过大
    const ids = idx.search(query.trim(), { limit: 100 });
    // 把 number[] 结果转成 string[] 再存成 Set，方便 O(1) 判断"某 id 是否命中"
    setResultIds(new Set(ids.map(String)));
  }, [query]);

  // useMemo：根据命中 id 集合过滤原始问题数组。
  // resultIds 为 null（未搜索）时直接返回全部；否则保留命中的问题。
  const filtered = useMemo(() => {
    if (resultIds === null) return problems;
    return problems.filter((p) => resultIds.has(p.id));
  }, [problems, resultIds]);

  return filtered;
}
