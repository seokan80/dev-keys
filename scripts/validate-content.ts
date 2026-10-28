// 콘텐츠 검증: 오류가 있으면 빌드·배포를 막는다 (계획서 8장). 경고는 보여 주기만 한다.
import { join } from 'node:path';
import { loadContent } from '../src/lib/content/load.ts';

const { sets, missions, vimLessons, problems } = loadContent(join(import.meta.dirname, '..'));
const errors = problems.filter((p) => p.level === 'error');
const warnings = problems.filter((p) => p.level === 'warning');

for (const p of warnings) console.warn(`⚠ ${p.path}: ${p.message}`);
for (const p of errors) console.error(`✗ ${p.path}: ${p.message}`);

if (errors.length > 0) {
  console.error(`\n콘텐츠 검증 실패: 오류 ${errors.length}건`);
  process.exit(1);
}

const lineCount = sets.reduce((n, s) => n + s.lines.length, 0);
console.log(
  `콘텐츠 검증 통과: 세트 ${sets.length}개 · 따라칠 줄 ${lineCount}줄 · Vim ${vimLessons.length}세트 · 미션 ${missions.length}개 · 경고 ${warnings.length}건`,
);
