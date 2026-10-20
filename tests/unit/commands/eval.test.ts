import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { searchEntriesOf } from '../../../src/lib/commands/catalog';
import { evaluate } from '../../../src/lib/commands/eval';
import { loadContent } from '../../../src/lib/content/load';

describe('evaluate', () => {
  const entries = [
    {
      slug: 'commit-amend-m',
      display: 'git commit --amend -m',
      situations: '마지막 커밋의 메시지를 고친다',
      notes: '',
    },
    { slug: 'restore-staged', display: 'git restore --staged', situations: '스테이징에서 내린다', notes: '' },
  ];

  it('1위 · 상위 3 · 상위 10 에 정답이 드는 수와 놓친 질문', () => {
    const r = evaluate(entries, [
      { q: '커밋 메시지 고치기', expect: ['commit-amend-m'] },
      { q: '스테이징 내리기', expect: ['restore-staged', 'restore-staged-p'] },
      { q: '쿠버네티스', expect: ['commit-amend-m'] },
    ]);
    expect(r).toMatchObject({ total: 3, top1: 2, top3: 2, top10: 2 });
    expect(r.misses).toEqual([{ q: '쿠버네티스', expect: ['commit-amend-m'], got: [] }]);
  });
});

// 기준선: 검색이나 세트를 바꿔 정답률이 떨어지면 실패한다. 오르면 기준을 올린다 (npm run eval:commands)
// 2026-10-20 ② 처음 잰 값 — 102문항 1위 52% · 상위 3 72% · 상위 10 86%
const BASELINE = { top1: 0.5, top3: 0.7, top10: 0.85 };

describe('명령 찾기 평가 세트 (content/commands/eval.yaml)', () => {
  const { catalog, evalCases } = loadContent(join(import.meta.dirname, '../../..'));
  const r = evaluate(searchEntriesOf(catalog), evalCases);

  it('질문이 100개 안팎 있다', () => {
    expect(r.total).toBeGreaterThanOrEqual(100);
  });

  it('정답률이 기준선 아래로 떨어지지 않는다', () => {
    expect(r.top1 / r.total).toBeGreaterThanOrEqual(BASELINE.top1);
    expect(r.top3 / r.total).toBeGreaterThanOrEqual(BASELINE.top3);
    expect(r.top10 / r.total).toBeGreaterThanOrEqual(BASELINE.top10);
  });
});
