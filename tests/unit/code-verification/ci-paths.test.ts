import { expect, it } from 'vitest';
import { needsCodeVerification } from '../../../scripts/lib/code-verification';
it('코드·실행 자료·로더·의존성·CI 변경을 모두 JVM 검사에 연결한다', () => {
  for (const path of [
    'content/sets/java/optional.yaml',
    'content/sets/spring/rest-controller.yaml',
    'content/guides/spring/rest-controller.md',
    'verify/java/build.gradle.kts',
    'verify/java/cases.yaml',
    'scripts/lib/code-runner.ts',
    'scripts/lib/code-verification.ts',
    'scripts/verify-code.ts',
    'scripts/test-code-verification.ts',
    'scripts/check-code-changes.ts',
    'tests/unit/code-verification/prepare.test.ts',
    'src/lib/content/load.ts',
    'src/schemas/set.ts',
    'package.json',
    'package-lock.json',
    '.github/workflows/ci.yml',
  ])
    expect(needsCodeVerification([path]), path).toBe(true);
  expect(
    needsCodeVerification([
      'src/components/vim/VimPlayer.tsx',
      'content/sets/git/basic-branch.yaml',
      'content/sets/shell/paths.yaml',
      'README.md',
    ]),
  ).toBe(false);
});
