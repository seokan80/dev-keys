import { describe, expect, it } from 'vitest';
import type { ContentSet } from '../../../src/lib/content/check';
import { nextSetOf, orderedSets } from '../../../src/lib/content/next';

const set = (category: 'git' | 'java' | 'spring', order: number) =>
  ({ id: `${category}-${order}`, category, order }) as ContentSet;

const sets = [set('spring', 1), set('git', 2), set('java', 1), set('git', 1)];

describe('orderedSets', () => {
  it('카테고리 순서(git → java → spring), 그 안에서 order 순', () => {
    expect(orderedSets(sets).map((s) => s.id)).toEqual(['git-1', 'git-2', 'java-1', 'spring-1']);
  });
});

describe('nextSetOf', () => {
  it('같은 카테고리의 다음 세트', () => {
    expect(nextSetOf(sets, set('git', 1))?.id).toBe('git-2');
  });

  it('카테고리 마지막이면 다음 카테고리의 첫 세트', () => {
    expect(nextSetOf(sets, set('git', 2))?.id).toBe('java-1');
  });

  it('전체 마지막이면 없음', () => {
    expect(nextSetOf(sets, set('spring', 1))).toBeNull();
  });
});
