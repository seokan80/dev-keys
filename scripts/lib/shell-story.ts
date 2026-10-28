import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { ContentSet } from '../../src/lib/content/check';

export type ShellStep = { command: string; status: number; output: string; cwd: string; entries: string[] };

/** 저장소가 관리하는 이야기만 실행한다. 사용자 입력을 실행하는 서버·브라우저 기능이 아니다. */
export function runShellStory(slug: string, root = process.cwd()): ShellStep[] {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) throw new Error('잘못된 이야기 이름');
  const dir = mkdtempSync(join(tmpdir(), 'devkeys-shell-'));
  const workspace = join(dir, 'workspace');
  const script = String.raw`
    set -e
    SHELL_ROOT="$1/workspace"
    SHELL_CAPTURE="$1/output"
    mkdir "$SHELL_ROOT"
    cd "$SHELL_ROOT" || exit 1
    SHELL_LAST_STATUS=0
    restore_status() { return "$1"; }
    step() {
      local status=0
      # 기록용 명령이 바꾼 $?를 복원한 직후 학습 명령을 실행한다.
      { restore_status "$SHELL_LAST_STATUS"; eval "$1" > "$SHELL_CAPTURE" 2>&1; } || status=$?
      SHELL_LAST_STATUS=$status
      printf '%s\0' "$1" "$status" "$(cat "$SHELL_CAPTURE")" "$PWD" "$(find "$SHELL_ROOT" -mindepth 1 -printf '%P%y\n')"
    }
    source "$2"
  `;
  try {
    const raw = execFileSync(
      'bash',
      ['--noprofile', '--norc', '-c', script, 'shell-story', dir, resolve(root, 'content/stories/shell', `${slug}.sh`)],
      {
        env: { PATH: process.env.PATH, LC_ALL: 'C', LANG: 'C', TZ: 'UTC' },
        encoding: 'utf8',
        timeout: 10_000,
        maxBuffer: 1024 * 1024,
      },
    );
    const fields = raw.split('\0');
    if (fields.pop() !== '' || fields.length % 5 !== 0) throw new Error('이야기 기록 형식 오류');
    const steps: ShellStep[] = [];
    for (let i = 0; i < fields.length; i += 5) {
      const [command, status, output, cwd, tree] = fields.slice(i, i + 5) as [string, string, string, string, string];
      if (cwd !== workspace && !cwd.startsWith(`${workspace}/`)) throw new Error('연습 경로 밖으로 이동했다');
      steps.push({
        command,
        status: Number(status),
        output: output.split(workspace).join('~/workspace'),
        cwd: cwd === workspace ? '.' : cwd.slice(workspace.length + 1),
        entries: tree
          ? tree
              .split('\n')
              .map((line) => line.slice(0, -1) + (line.endsWith('d') ? '/' : ''))
              .sort()
          : [],
      });
    }
    return steps;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function checkShellStory(set: ContentSet, root = process.cwd()): string[] {
  const actual = runShellStory(set.slug, root);
  const problems: string[] = [];
  if (actual.length !== set.lines.length)
    problems.push(`${set.id}: 명령 수 ${set.lines.length} != 이야기 ${actual.length}`);
  set.lines.forEach((line, index) => {
    const step = actual[index];
    if (!step) return;
    const label = `${set.id}/${line.itemId}`;
    if (line.text !== step.command) problems.push(`${label}: 이야기 명령과 다름`);
    if (step.status !== (line.exitCode ?? 0))
      problems.push(`${label}: 종료 상태 ${step.status} (기대 ${line.exitCode ?? 0})`);
    if ((line.output ?? '') !== step.output) problems.push(`${label}: 실제 출력과 다름`);
    if (
      line.fileState?.cwd !== step.cwd ||
      JSON.stringify([...(line.fileState?.entries ?? [])].sort()) !== JSON.stringify(step.entries)
    )
      problems.push(`${label}: 실제 파일 트리·현재 경로와 다름`);
  });
  return problems;
}
