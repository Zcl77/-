import { useCallback, useEffect, useMemo, useState } from 'react';
import { Project } from '../types';

const STORAGE_KEY = 'zhixing.inquiry-cart';

function readIds(): string[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function useInquiryCart(projects: Project[]) {
  const [ids, setIds] = useState<string[]>(() => (typeof window === 'undefined' ? [] : readIds()));
  const persist = useCallback((next: string[]) => {
    setIds(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // A private browser may disable storage; the in-memory cart still works.
    }
  }, []);
  const add = useCallback((project: Project) => {
    setIds((current) => {
      if (current.includes(project.id)) return current;
      const next = [...current, project.id];
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* best effort */
      }
      return next;
    });
  }, []);
  const remove = useCallback((id: string) => persist(ids.filter((item) => item !== id)), [ids, persist]);
  const clear = useCallback(() => persist([]), [persist]);
  const items = useMemo(
    () => ids.map((id) => projects.find((project) => project.id === id)).filter(Boolean) as Project[],
    [ids, projects],
  );
  useEffect(() => {
    const valid = ids.filter((id) => projects.some((project) => project.id === id));
    if (valid.length !== ids.length) persist(valid);
  }, [ids, persist, projects]);
  return { items, count: items.length, add, remove, clear };
}
