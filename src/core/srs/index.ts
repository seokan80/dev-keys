import type { SrsEntry } from '../storage';

/** 오답 반복 간격(일). 틀리면 0 단계, 예정일에 맞히면 다음 단계, 마지막 단계를 넘기면 졸업 */
export const INTERVALS = [1, 3, 7, 14] as const;

/** 오답 기록 키 */
export const srsKey = (setId: string, itemId: string) => `${setId}/${itemId}`;

/** 'YYYY-MM-DD' 에 n 일을 더한다 (시간대와 상관없이 날짜만) */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** 예정일 당일부터 복습 대상 ('YYYY-MM-DD' 는 글자 비교가 곧 날짜 비교) */
export const isDue = (entry: SrsEntry, today: string) => entry.due <= today;

/** 한 문제를 풀었을 때 오답 기록 갱신. today = 'YYYY-MM-DD' */
export function review(
  srs: Readonly<Record<string, SrsEntry>>,
  key: string,
  correct: boolean,
  today: string,
): Record<string, SrsEntry> {
  const prev = srs[key];
  if (!correct) {
    const entry: SrsEntry = { step: 0, wrong: (prev?.wrong ?? 0) + 1, due: addDays(today, INTERVALS[0]) };
    if (prev?.lastCorrect) entry.lastCorrect = prev.lastCorrect;
    return { ...srs, [key]: entry };
  }
  // 틀린 적 없거나, 예정일 전에 다시 푼 것은 그대로 (바로 다시 풀어 졸업하지 않게)
  if (!prev || !isDue(prev, today)) return srs;
  const step = prev.step + 1;
  if (step >= INTERVALS.length) {
    const rest = { ...srs };
    delete rest[key];
    return rest;
  }
  return { ...srs, [key]: { step, wrong: prev.wrong, lastCorrect: today, due: addDays(today, INTERVALS[step]!) } };
}

/**
 * 도전 세트 구성: 같은 카테고리에서 예정일이 지난 다른 세트의 오답을 세트 길이의 ratio 까지 앞에 섞는다.
 * 교체라 세트 길이는 그대로 — 끝에서부터, 오답 기록이 없는 문제를 뺀다.
 * review: 복습 표시할 문제 키 (섞은 것 + 이 세트 안의 복습 대상)
 */
export function pickDue<T extends { key: string }>(
  set: readonly T[],
  pool: readonly T[],
  srs: Readonly<Record<string, SrsEntry>>,
  today: string,
  ratio = 0.3,
): { items: T[]; review: string[] } {
  const own = new Set(set.map((q) => q.key));
  const due = (q: T) => srs[q.key] !== undefined && isDue(srs[q.key]!, today);
  const extra = pool
    .filter((q) => !own.has(q.key) && due(q))
    .sort((a, b) => srs[a.key]!.due.localeCompare(srs[b.key]!.due) || a.key.localeCompare(b.key))
    .slice(0, Math.floor(set.length * ratio));

  const drop = new Set<string>();
  for (let i = set.length - 1; i >= 0 && drop.size < extra.length; i--) {
    if (srs[set[i]!.key] === undefined) drop.add(set[i]!.key);
  }
  const kept = set.filter((q) => !drop.has(q.key));
  const items = [...extra.slice(0, drop.size), ...kept];
  return { items, review: items.filter(due).map((q) => q.key) };
}
