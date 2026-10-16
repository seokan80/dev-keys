import { CATEGORY_IDS } from '../../schemas/categories';
import type { ContentSet } from './check';

/** 카테고리 순서(CATEGORIES), 그 안에서 order 순 */
export function orderedSets<T extends Pick<ContentSet, 'category' | 'order'>>(sets: readonly T[]): T[] {
  const rank = (s: T) => CATEGORY_IDS.indexOf(s.category);
  return [...sets].sort((a, b) => rank(a) - rank(b) || a.order - b.order);
}

/** 다음에 할 세트: 같은 카테고리의 다음, 카테고리 마지막이면 다음 카테고리의 처음 */
export function nextSetOf<T extends Pick<ContentSet, 'id' | 'category' | 'order'>>(
  sets: readonly T[],
  current: Pick<ContentSet, 'id'>,
): T | null {
  const ordered = orderedSets(sets);
  const i = ordered.findIndex((s) => s.id === current.id);
  return i === -1 ? null : (ordered[i + 1] ?? null);
}
