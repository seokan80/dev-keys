// Git 세트의 출력(output)이 실제 git 으로 이야기를 돌린 결과와 같은지 본다 (콘텐츠 작성 · git 버전을 올릴 때).
//   npx tsx scripts/git-story-check.ts <슬러그>   예: config-ignore
// content/stories/git/<슬러그>.sh 를 scripts/git-story.sh 로 돌려, content/sets/git/<슬러그>.yaml 의 copy 문제와 맞춰 본다.
// git 버전마다 출력이 조금씩 달라서 CI 에서는 돌리지 않는다.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

const slug = process.argv[2];
const root = join(import.meta.dirname, '..');
const story = join(root, 'content/stories/git', `${slug}.sh`);
const setFile = join(root, 'content/sets/git', `${slug}.yaml`);
if (!slug || !existsSync(story) || !existsSync(setFile)) {
  console.error('쓰는 법: npx tsx scripts/git-story-check.ts <슬러그> (이야기 · 세트 파일이 모두 있어야 한다)');
  process.exit(2);
}

const transcript = execFileSync(join(root, 'scripts/git-story.sh'), [story], { encoding: 'utf8' });
const version = transcript.split('\n')[0];
// 이야기 순서대로: 같은 명령(git status 등)이 여러 번 나오므로 세트 문제와 차례로 짝짓는다
const steps = transcript
  .split(/\n\$ /)
  .slice(1)
  .map((chunk) => {
    const [command, ...out] = chunk.split('\n');
    return { command: command!, output: out.join('\n').replace(/\n+$/, '') };
  });
let at = 0;

type Item = { id: string; type: string; text: string; output?: string; prompt?: string };
const items = (parse(readFileSync(setFile, 'utf8')) as { items: Item[] }).items.filter((i) => i.type === 'copy');
const clean = (text: string | undefined) => (text ?? '').replace(/\n$/, '');
let bad = 0;
for (let k = 0; k < items.length; k++) {
  const item = items[k]!;
  // 대화형 답 줄(prompt)은 앞 명령의 출력 안에 "질문? 답" 으로 들어 있다 — 명령과 함께 맞춰 본다
  const answers: Item[] = [];
  while (items[k + 1]?.prompt !== undefined) answers.push(items[++k]!);
  const found = steps.findIndex((s, i) => i >= at && s.command === item.text);
  if (found === -1) {
    bad += 1;
    console.log(`✗ ${item.id}: 이야기에 "${item.text}" 가 없다`);
    continue;
  }
  at = found + 1;
  const got = steps[found]!.output;
  let mine = clean(item.output);
  for (const a of answers) {
    mine += `${mine ? '\n' : ''}${a.prompt} ${a.text}`;
    if (a.output) mine += `\n${clean(a.output)}`;
  }
  if (got !== mine) {
    bad += 1;
    console.log(
      `✗ ${item.id}: ${item.text}\n  세트:\n${mine.replace(/^/gm, '    ')}\n  git:\n${got.replace(/^/gm, '    ')}`,
    );
  }
}
console.log(bad === 0 ? `${version} — 출력 ${items.length}개 모두 같다` : `${version} — 다른 것 ${bad}개`);
process.exit(bad === 0 ? 0 : 1);
