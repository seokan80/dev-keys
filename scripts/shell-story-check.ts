import { getSets } from '../src/lib/content/load';
import { checkShellStory } from './lib/shell-story';

const slug = process.argv[2];
const sets = getSets().filter((set) => set.category === 'shell' && (!slug || set.slug === slug));
if (slug && sets.length === 0) throw new Error(`Shell 세트가 없다: ${slug}`);
let failed = false;
for (const set of sets) {
  const problems = checkShellStory(set);
  if (problems.length) {
    failed = true;
    console.error(problems.join('\n'));
  } else console.log(`Shell 이야기 일치: ${set.slug} (${set.lines.length}개 명령·출력·파일 상태)`);
}
if (failed) process.exitCode = 1;
