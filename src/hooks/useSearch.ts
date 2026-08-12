import { useEffect, useMemo, useRef, useState } from 'react';
import { Index as FlexSearchIndex } from 'flexsearch';
import type { Problem } from '../types';

interface SearchableDoc {
  id: string;
  title: string;
  statement: string;
}

export function useSearchProblems(problems: Problem[], query: string) {
  const indexRef = useRef<FlexSearchIndex | null>(null);
  const docsRef = useRef<Map<string, SearchableDoc>>(new Map());
  const [resultIds, setResultIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    const idx = new FlexSearchIndex({
      tokenize: 'forward',
      resolution: 9,
    });
    const docs = new Map<string, SearchableDoc>();

    for (const p of problems) {
      const doc: SearchableDoc = {
        id: p.id,
        title: p.title,
        statement: p.problemStatement || '',
      };
      docs.set(p.id, doc);
      idx.add(p.id as unknown as number, `${doc.title} ${doc.statement}`);
    }

    indexRef.current = idx;
    docsRef.current = docs;
  }, [problems]);

  useEffect(() => {
    if (!query.trim()) {
      setResultIds(null);
      return;
    }
    const idx = indexRef.current;
    if (!idx) {
      setResultIds(null);
      return;
    }
    const ids = idx.search(query.trim(), { limit: 100 });
    setResultIds(new Set(ids.map(String)));
  }, [query]);

  const filtered = useMemo(() => {
    if (resultIds === null) return problems;
    return problems.filter((p) => resultIds.has(p.id));
  }, [problems, resultIds]);

  return filtered;
}
