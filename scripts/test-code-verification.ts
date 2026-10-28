import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { prepareCodeVerification, runCodeVerification } from './lib/code-runner';

try {
  const cases = prepareCodeVerification();
  const sample = cases.find((c) => c.results > 0);
  if (!sample) throw new Error('회귀 시험에는 표시 결과가 있는 코드 문제가 필요하다');
  const dir = join('verify/java/build/generated', sample.id);
  function run() {
    return runCodeVerification(process.cwd(), true);
  }
  function requirePass() {
    const result = run();
    if (result.status !== 0) throw new Error(result.output);
    console.log('기존 코드 컴파일·표시 결과 통과');
  }
  function reject(file: string, mutate: (text: string) => string, expected: RegExp) {
    const path = join(dir, file);
    const original = readFileSync(path, 'utf8');
    try {
      writeFileSync(path, mutate(original));
      const result = run();
      if (result.status === 0 || !expected.test(result.output))
        throw new Error(`실패를 감지하지 못했다: ${file}\n${result.output}`);
      console.log(`오류 감지 통과: ${file} · ${expected.source}`);
    } finally {
      writeFileSync(path, original);
    }
  }
  requirePass();
  reject(
    sample.files[0]!.path,
    (text) => text + '\nclass InvalidSource {\n',
    /compileJava FAILED[\s\S]*error:|error:[\s\S]*compileJava FAILED/,
  );
  // 실제 코드가 내놓는 값과 화면의 기대 결과가 어긋나는 경우를 재현한다.
  reject(
    'Verification.java',
    (text) =>
      text.replace(
        /Map\.entry\(("(?:[^"\\]|\\.)*"), ("(?:[^"\\]|\\.)*")\)/,
        (_entry, at: string, result: string) =>
          `Map.entry(${at}, ${JSON.stringify(JSON.parse(result) + ' (changed)')})`,
      ),
    /결과 불일치/,
  );
  reject('RunVerification.java', (text) => text.replace('VerifyMain.run();', ''), /미검증 결과/);
  requirePass();
  console.log('검증기 회귀 시험 통과: 컴파일 오류·결과 불일치·결과 누락을 모두 차단');
} catch (error) {
  console.error(String(error));
  process.exitCode = 1;
}
