import { describe, expect, it } from 'vitest';
import { buildCurricula } from '../../../src/lib/content/curriculum';

const set = (slug: string, order: number, category = 'git') => ({ category, slug, order, id: `${category}-${slug}` });
const sets = [set('a', 1), set('b', 2), set('c', 3), set('j', 1, 'java')];
const file = (text: string, path = 'content/curriculum/git.yaml') => [{ path, text }];

const ok = `
parts:
  - title: 로컬
    description: 혼자 쓰는 Git
    sets: [a, b]
  - title: 기록 다듬기
    description: 아직 없음
    planned: [커밋 정리, 태그와 릴리스]
  - title: 원격
    description: 함께 쓰는 Git
    sets: [c]
    planned: [서브모듈]
`;

describe('buildCurricula', () => {
  it('부마다 번호 · 세트(목록 순서) · 준비 중 항목을 붙인다', () => {
    const r = buildCurricula(file(ok), sets);
    expect(r.problems).toEqual([]);
    const [git] = r.curricula;
    expect(git!.category).toBe('git');
    expect(git!.parts.map((p) => [p.no, p.title, p.sets.map((s) => s.slug), p.planned])).toEqual([
      [1, '로컬', ['a', 'b'], []],
      [2, '기록 다듬기', [], ['커밋 정리', '태그와 릴리스']],
      [3, '원격', ['c'], ['서브모듈']],
    ]);
  });

  it('카테고리에 있는데 목록에 없는 세트는 오류 — 새 세트는 부에 넣어야 보인다', () => {
    const r = buildCurricula(file('parts:\n  - { title: 로컬, description: x, sets: [a, b] }\n'), sets);
    expect(r.problems.map((p) => p.message)).toEqual([expect.stringContaining('c')]);
  });

  it('없는 세트 · 다른 카테고리 세트 · 두 번 넣은 세트는 오류', () => {
    const r = buildCurricula(file('parts:\n  - { title: 로컬, description: x, sets: [a, b, c, zz, j, a] }\n'), sets);
    const messages = r.problems.map((p) => p.message).join('\n');
    expect(messages).toContain('zz');
    expect(messages).toContain('j');
    expect(messages).toMatch(/a.*두 번/);
  });

  it('목록 순서가 세트 order 와 다르면 오류 — 다음 세트 안내가 목록 순서를 따르게', () => {
    const r = buildCurricula(file('parts:\n  - { title: 로컬, description: x, sets: [b, a, c] }\n'), sets);
    expect(r.problems.map((p) => p.message)).toEqual([expect.stringContaining('order')]);
  });

  it('세트도 준비 중 항목도 없는 부, 모르는 카테고리, 형식 오류를 알린다', () => {
    expect(
      buildCurricula(
        file('parts:\n  - { title: 빈 부, description: x }\n  - { title: 로컬, description: x, sets: [a, b, c] }\n'),
        sets,
      ).problems,
    ).toHaveLength(1);
    expect(buildCurricula(file(ok, 'content/curriculum/rust.yaml'), sets).problems).toHaveLength(1);
    expect(buildCurricula(file('parts: [{ title: 로컬 }]'), sets).problems.length).toBeGreaterThan(0);
  });

  it('목록 파일이 없는 카테고리는 그대로 (오류 없음)', () => {
    expect(buildCurricula([], sets)).toEqual({ curricula: [], problems: [] });
  });
});
