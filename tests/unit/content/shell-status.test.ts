import { execFileSync } from 'node:child_process';
import { expect, it } from 'vitest';
import { runShellStory } from '../../../scripts/lib/shell-story';

it('이야기의 출력·파일 상태 기록이 직전 명령의 $?를 덮어쓰지 않는다', () => {
  const actual = runShellStory('status');
  const reference = execFileSync(
    'bash',
    ['--noprofile', '--norc', '-c', 'false; printf "%s\\n" "$?"; true; printf "%s\\n" "$?"'],
    { encoding: 'utf8' },
  )
    .trim()
    .split('\n');
  const falseIndex = actual.findIndex((step) => step.command === 'false');
  const trueIndex = actual.findIndex((step) => step.command === 'true');
  expect(actual[falseIndex + 1]?.output).toBe(reference[0]);
  expect(actual[trueIndex + 1]?.output).toBe(reference[1]);
});

it('파이프 각 상태와 pipefail 전후 전체 상태를 실제 Bash와 대조한다', () => {
  const actual = runShellStory('status');
  expect(actual.filter((step) => step.command === 'false | true').map((step) => step.status)).toEqual([0, 1]);
  const command = 'false | true; printf "%s\\n" "${PIPESTATUS[*]}"';
  const reference = execFileSync('bash', ['--noprofile', '--norc', '-c', command], { encoding: 'utf8' }).trim();
  expect(actual.find((step) => step.command === command)?.output).toBe(reference);
});

it('grep은 일치 없음 1과 읽기 오류 2를 구분해 기록한다', () => {
  const steps = runShellStory('grep-logs');
  expect(steps.find((step) => step.command === 'grep -q "FATAL" project/logs/app.log')?.status).toBe(1);
  const missing = steps.find((step) => step.command.includes('missing.log'))!;
  expect(missing.status).toBe(2);
  expect(missing.output).toContain('No such file or directory');
});
