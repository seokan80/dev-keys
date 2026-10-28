import { appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { needsCodeVerification } from './lib/code-verification';
const { BASE_SHA, HEAD_SHA, GITHUB_OUTPUT } = process.env;
if (!GITHUB_OUTPUT) throw new Error('GitHub Actions 출력 경로가 없다');
let changed = true;
if (BASE_SHA && !/^0+$/.test(BASE_SHA)) {
  if (!/^[a-f0-9]{40}$/.test(BASE_SHA) || !HEAD_SHA || !/^[a-f0-9]{40}$/.test(HEAD_SHA))
    throw new Error('비교할 커밋 SHA 오류');
  // checkout은 전체 이력을 가져온다. diff 실패를 건너뛰기로 처리하지 않는다.
  changed = needsCodeVerification(
    execFileSync('git', ['diff', '--name-only', BASE_SHA, HEAD_SHA], { encoding: 'utf8' }).split('\n'),
  );
}
appendFileSync(GITHUB_OUTPUT, `changed=${changed}\n`);
console.log(`Java·Spring 검증: ${changed ? '실행' : '관련 변경 없음'}`);
