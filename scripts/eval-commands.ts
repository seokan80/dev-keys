// 명령 찾기 정답률: content/commands/eval.yaml 의 질문을 검색에 넣어 1위 · 상위 3 · 상위 10 에 정답이 드는 비율을 본다.
//   npm run eval:commands
import { join } from 'node:path';
import { searchEntriesOf } from '../src/lib/commands/catalog.ts';
import { evaluate } from '../src/lib/commands/eval.ts';
import { loadContent } from '../src/lib/content/load.ts';

const { catalog, evalCases, problems } = loadContent(join(import.meta.dirname, '..'));
const errors = problems.filter((p) => p.level === 'error');
if (errors.length > 0) {
  for (const p of errors) console.error(`✗ ${p.path}: ${p.message}`);
  process.exit(1);
}
const r = evaluate(searchEntriesOf(catalog), evalCases);
const pct = (n: number) => `${Math.round((n / r.total) * 100)}% (${n}/${r.total})`;
for (const m of r.misses)
  console.log(`✗ ${m.q}\n    정답 ${m.expect.join(' · ')}\n    나옴 ${m.got.join(' · ') || '(없음)'}`);
console.log(
  `\n명령 ${catalog.length}개 · 질문 ${r.total}개 — 1위 ${pct(r.top1)} · 상위 3 ${pct(r.top3)} · 상위 10 ${pct(r.top10)}`,
);
