import { describe, expect, it } from 'vitest';
import { INTERVALS, addDays, isDue, pickDue, review, srsKey } from '@core/srs';
import type { SrsEntry } from '@core/storage';

const DAY = '2026-10-17';

describe('날짜', () => {
  it('addDays 는 달 · 해를 넘긴다', () => {
    expect(addDays(DAY, 1)).toBe('2026-10-18');
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-25', 14)).toBe('2027-01-08');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('isDue: 예정일 당일부터', () => {
    const e: SrsEntry = { step: 0, wrong: 1, due: '2026-10-18' };
    expect(isDue(e, DAY)).toBe(false);
    expect(isDue(e, '2026-10-18')).toBe(true);
    expect(isDue(e, '2026-11-02')).toBe(true);
  });

  it('srsKey = 세트 id / 문제 id', () => {
    expect(srsKey('git-basic-commit', 'reset-soft')).toBe('git-basic-commit/reset-soft');
  });
});

describe('review — 간격 [1, 3, 7, 14]일', () => {
  const key = 'git-basic-commit/reset-soft';

  it('틀리면 처음 단계로, 다음 날 다시', () => {
    expect(INTERVALS).toEqual([1, 3, 7, 14]);
    expect(review({}, key, false, DAY)).toEqual({ [key]: { step: 0, wrong: 1, due: '2026-10-18' } });
  });

  it('한 번도 틀린 적 없는 문제를 맞히면 기록하지 않는다', () => {
    const srs = {};
    expect(review(srs, key, true, DAY)).toBe(srs);
  });

  it('예정일에 맞히면 다음 단계, 마지막 단계를 넘기면 졸업(목록에서 빠진다)', () => {
    let srs = review({}, key, false, DAY);
    for (let step = 1; step < INTERVALS.length; step++) {
      const day = srs[key]!.due;
      srs = review(srs, key, true, day);
      expect(srs[key]).toEqual({ step, wrong: 1, lastCorrect: day, due: addDays(day, INTERVALS[step]!) });
    }
    srs = review(srs, key, true, srs[key]!.due);
    expect(srs).toEqual({});
  });

  it('예정일 전에 맞히면 그대로 (바로 다시 풀어 졸업하지 않게)', () => {
    const srs = review({}, key, false, DAY);
    expect(review(srs, key, true, DAY)).toBe(srs);
  });

  it('다시 틀리면 처음 단계로, 틀린 횟수는 쌓이고 마지막 정답일은 남긴다', () => {
    const srs = { [key]: { step: 2, wrong: 1, lastCorrect: '2026-10-10', due: DAY } };
    expect(review(srs, key, false, DAY)[key]).toEqual({
      step: 0,
      wrong: 2,
      lastCorrect: '2026-10-10',
      due: '2026-10-18',
    });
  });

  it('다른 문제 기록은 건드리지 않는다', () => {
    const other = { 'x/y': { step: 1, wrong: 1, due: '2026-10-20' } };
    expect(review(other, key, false, DAY)['x/y']).toBe(other['x/y']);
  });
});

describe('pickDue — 간격이 지난 오답을 30% 까지 섞는다 (교체라 세트 길이 유지)', () => {
  const q = (set: string, id: string) => ({ key: `${set}/${id}` });
  const own = Array.from({ length: 10 }, (_, i) => q('a', `q${i}`));
  const pool = [...own, ...Array.from({ length: 6 }, (_, i) => q('b', `r${i}`))];
  const wrong = (due: string) => ({ step: 0, wrong: 1, due });

  it('복습할 것이 없으면 세트 그대로', () => {
    expect(pickDue(own, pool, {}, DAY)).toEqual({ items: own, review: [] });
  });

  it('예정일이 지난 다른 세트의 오답을 앞에 두고, 끝에서 같은 수만큼 뺀다', () => {
    const srs = { 'b/r1': wrong('2026-10-16'), 'b/r0': wrong(DAY), 'b/r2': wrong('2026-10-18') };
    const r = pickDue(own, pool, srs, DAY);
    expect(r.items.map((x) => x.key)).toEqual(['b/r1', 'b/r0', ...own.slice(0, 8).map((x) => x.key)]);
    expect(r.review).toEqual(['b/r1', 'b/r0']);
  });

  it('많아도 세트 길이의 30% 까지, 오래 밀린 것부터', () => {
    const srs = Object.fromEntries(pool.slice(10).map((x, i) => [x.key, wrong(`2026-10-0${i + 1}`)]));
    const r = pickDue(own, pool, srs, DAY);
    expect(r.items).toHaveLength(10);
    expect(r.review).toEqual(['b/r0', 'b/r1', 'b/r2']);
  });

  it('이 세트의 오답은 세트 안에서 복습 표시만 하고, 빼는 것은 오답이 아닌 문제부터', () => {
    const srs = { 'a/q9': wrong(DAY), 'b/r0': wrong(DAY) };
    const r = pickDue(own, pool, srs, DAY);
    expect(r.items.map((x) => x.key)).toEqual(['b/r0', ...own.slice(0, 8).map((x) => x.key), 'a/q9']);
    expect(r.review).toEqual(['b/r0', 'a/q9']);
  });

  it('세트가 짧으면 섞지 않는다 (30% 가 1 문제가 안 될 때)', () => {
    const srs = { 'b/r0': wrong(DAY) };
    expect(pickDue(own.slice(0, 3), pool, srs, DAY).review).toEqual([]);
  });
});
