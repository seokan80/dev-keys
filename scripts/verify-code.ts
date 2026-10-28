import { prepareCodeVerification, runCodeVerification } from './lib/code-runner';
try {
  const cases = prepareCodeVerification();
  console.log(
    `Java·Spring ${cases.length}문제 컴파일 · 표시 결과 ${cases.reduce((n, c) => n + c.results, 0)}개 실행 검증`,
  );
  const result = runCodeVerification();
  process.exitCode = result.status;
} catch (error) {
  console.error(String(error));
  process.exitCode = 1;
}
