import { describe, expect, it } from 'vitest';
import { recommend, resumeOf, type PlanSet } from '../../../src/lib/content/recommend';

const set = (id: string, recall = true): PlanSet => ({
  id,
  title: `세트 ${id}`,
  href: `/git/${id}`,
  challengeHref: recall ? `/git/challenge/${id}` : null,
  recallKeys: recall ? [`${id}/q1`, `${id}/q2`] : [],
});
const SETS = [set('a'), set('b'), set('c', false)];
const DAY = '2026-10-17';
const best = { cpm: 200, accuracy: 0.95, at: '2026-10-16T00:00:00.000Z' };
const wrong = (due: string) => ({ step: 0, wrong: 1, due });

describe('recommend — 오늘의 추천', () => {
  it('복습할 문제가 있으면 복습: 가장 오래 밀린 문제가 있는 세트의 도전 모드', () => {
    const srs = { 'b/q1': wrong('2026-10-15'), 'a/q2': wrong(DAY), 'a/q1': wrong('2026-10-20') };
    expect(recommend(SETS, { bests: {}, srs }, DAY)).toEqual({
      kind: 'review',
      count: 2,
      href: '/git/challenge/b',
      title: '세트 b',
    });
  });

  it('예정일이 안 됐거나 지금은 없는 문제는 세지 않는다', () => {
    const srs = { 'a/q1': wrong('2026-10-18'), 'gone/q1': wrong(DAY) };
    expect(recommend(SETS, { bests: {}, srs }, DAY)).toMatchObject({ kind: 'next', href: '/git/a' });
  });

  it('복습이 없으면 따라치기를 아직 끝내지 않은 첫 세트', () => {
    const bests = { 'a:copy': best };
    expect(recommend(SETS, { bests, srs: {} }, DAY)).toEqual({ kind: 'next', href: '/git/b', title: '세트 b' });
  });

  it('따라치기를 모두 끝냈으면 도전하지 않은 첫 세트, 그것도 다 했으면 없음', () => {
    const copied = Object.fromEntries(SETS.map((s) => [`${s.id}:copy`, best]));
    expect(recommend(SETS, { bests: { ...copied, 'a:recall': { ...best, score: 900 } }, srs: {} }, DAY)).toEqual({
      kind: 'challenge',
      href: '/git/challenge/b',
      title: '세트 b',
    });
    const all = { ...copied, 'a:recall': best, 'b:recall': best };
    expect(recommend(SETS, { bests: all, srs: {} }, DAY)).toBeNull();
  });
});

describe('resumeOf — 이어하기', () => {
  it('마지막에 한 세트(따라치기 · 도전)를 찾는다', () => {
    expect(resumeOf(SETS, { path: '/git/b', at: DAY })).toEqual({ href: '/git/b', title: '세트 b', mode: 'copy' });
    expect(resumeOf(SETS, { path: '/git/challenge/a', at: DAY })).toEqual({
      href: '/git/challenge/a',
      title: '세트 a',
      mode: 'recall',
    });
  });

  it('기록이 없거나 지금은 없는 주소면 없음', () => {
    expect(resumeOf(SETS, undefined)).toBeNull();
    expect(resumeOf(SETS, { path: '/git/gone', at: DAY })).toBeNull();
  });
});
