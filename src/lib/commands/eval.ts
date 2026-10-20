// 명령 찾기 평가: 상황 질문 → 정답 명령 주소. 1위 · 상위 3 · 상위 10 정답률과 놓친 질문 (순수 함수).
import { z } from 'zod';
import { searchCommands, type SearchEntry } from './search';

export const evalSchema = z.array(
  z.object({ q: z.string().min(1), expect: z.array(z.string().min(1)).min(1) }).strict(),
);
export type EvalCase = z.infer<typeof evalSchema>[number];

export type EvalReport = {
  total: number;
  top1: number;
  top3: number;
  top10: number;
  /** 상위 3 에 정답이 없는 질문과 실제로 나온 앞 3개 */
  misses: { q: string; expect: string[]; got: string[] }[];
};

export function evaluate(entries: readonly SearchEntry[], cases: readonly EvalCase[]): EvalReport {
  let top1 = 0;
  let top3 = 0;
  let top10 = 0;
  const misses: EvalReport['misses'] = [];
  for (const c of cases) {
    const got = searchCommands(entries, c.q, 10).map((e) => e.slug);
    const rank = got.findIndex((s) => c.expect.includes(s));
    if (rank === 0) top1 += 1;
    if (rank >= 0 && rank < 3) top3 += 1;
    else misses.push({ q: c.q, expect: c.expect, got: got.slice(0, 3) });
    if (rank >= 0) top10 += 1;
  }
  return { total: cases.length, top1, top3, top10, misses };
}
