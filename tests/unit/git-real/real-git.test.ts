/**
 * 실제 git 대조 테스트 (구현계획 M3): 같은 명령열을 엔진과 임시 저장소의 실제 git 에 함께 돌려
 * 명령마다 성공 · 실패가 같은지, 끝난 뒤 브랜치 · HEAD 가 가리키는 커밋 모양이 같은지 본다.
 *
 * - 커밋마다 서로 다른 파일(C2.txt …)을 하나씩 더한다 → 충돌 · 빈 커밋 없이 rebase · cherry-pick · revert 가 돈다
 * - 커밋 메시지 = 라벨. 복사본(rebase · cherry-pick)은 원본 메시지를 지니고, 되돌림은 Revert "C2"
 * - 모양: 머지 커밋은 M(부모들), 나머지는 메시지(부모) — 해시 · 머지 메시지는 비교하지 않는다
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { execute, headCommit, initialRepo, tokenize, type RepoState } from '../../../src/core/git';

const hasGit = (() => {
  try {
    execFileSync('git', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

/** 사용자 · 시스템 설정에 흔들리지 않게 */
const env: NodeJS.ProcessEnv = {
  PATH: process.env.PATH,
  HOME: tmpdir(),
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
  GIT_MERGE_AUTOEDIT: 'no',
  GIT_EDITOR: 'true',
  LANG: 'C',
};

const dirs: string[] = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

class RealRepo {
  readonly dir = mkdtempSync(join(tmpdir(), 'devkeys-git-'));
  private readonly sha = new Map<string, string>();

  constructor() {
    dirs.push(this.dir);
    this.git('init', '-q', '-b', 'main');
    this.commit('C1');
  }

  git(...args: string[]): { ok: boolean; out: string } {
    try {
      return {
        ok: true,
        out: execFileSync('git', args, { cwd: this.dir, env, encoding: 'utf8', stdio: 'pipe' }).trim(),
      };
    } catch (e) {
      const err = e as { stderr?: string; stdout?: string };
      return { ok: false, out: `${err.stdout ?? ''}${err.stderr ?? ''}`.trim() };
    }
  }

  commit(label: string) {
    writeFileSync(join(this.dir, `${label}.txt`), `${label}\n`);
    this.git('add', '-A');
    const r = this.git('commit', '-q', '-m', label);
    if (r.ok) this.sha.set(label.toLowerCase(), this.git('rev-parse', 'HEAD').out);
    return r;
  }

  /** 명령 속 라벨(C2)을 실제 해시로 */
  run(command: string) {
    const args = tokenize(command)!;
    const translated = args.map((a) => this.sha.get(a.toLowerCase()) ?? a);
    return this.git(...(translated[0] === 'git' ? translated.slice(1) : translated));
  }

  snapshot() {
    const lines = this.git('log', '--all', '--format=%H%x09%P%x09%s', 'HEAD').out.split('\n');
    const commits = new Map(
      lines.map((l) => {
        const [h, p, s] = l.split('\t') as [string, string, string];
        return [h, { parents: p ? p.split(' ') : [], subject: s }];
      }),
    );
    const memo = new Map<string, string>();
    const shape = (h: string): string => {
      if (memo.has(h)) return memo.get(h)!;
      const c = commits.get(h)!;
      const v = `${c.parents.length > 1 ? 'M' : c.subject}(${c.parents.map(shape).join(',')})`;
      memo.set(h, v);
      return v;
    };
    const branches: Record<string, string> = {};
    for (const line of this.git('for-each-ref', '--format=%(refname:short) %(objectname)', 'refs/heads').out.split(
      '\n',
    )) {
      const [name, h] = line.split(' ') as [string, string];
      branches[name] = shape(h);
    }
    const sym = this.git('symbolic-ref', '-q', '--short', 'HEAD');
    return { branches, head: sym.ok ? sym.out : shape(this.git('rev-parse', 'HEAD').out) };
  }
}

function engineSnapshot(state: RepoState) {
  const memo = new Map<string, string>();
  const shape = (id: string): string => {
    if (memo.has(id)) return memo.get(id)!;
    const c = state.commits[id]!;
    const v = `${c.parents.length > 1 ? 'M' : (c.message ?? c.label)}(${c.parents.map(shape).join(',')})`;
    memo.set(id, v);
    return v;
  };
  const branches = Object.fromEntries(Object.entries(state.branches).map(([n, id]) => [n, shape(id)]));
  return { branches, head: state.head.type === 'branch' ? state.head.name : shape(headCommit(state)) };
}

/** "commit" 은 라벨을 메시지로 붙여 실행한다 */
function check(steps: string[]) {
  const repo = new RealRepo();
  let state = initialRepo();
  for (const step of steps) {
    const label = `C${state.seq}`;
    const r = execute(state, step === 'commit' ? `commit -m ${label}` : step);
    const real = step === 'commit' ? repo.commit(label) : repo.run(step);
    expect(
      r.error === null,
      `"${step}" — 엔진: ${r.error ? `실패 (${r.error.message})` : '성공'}, 실제 git: ${real.ok ? '성공' : `실패 (${real.out})`}`,
    ).toBe(real.ok);
    if (!r.error) state = r.state;
  }
  expect(engineSnapshot(state)).toEqual(repo.snapshot());
}

const diverged = ['switch -c feature', 'commit', 'switch main', 'commit'];

const SCENARIOS: Record<string, string[]> = {
  '커밋 둘': ['commit', 'commit'],
  '브랜치 만들고 이동해 커밋': ['branch feature', 'switch feature', 'commit'],
  'merge: fast-forward': ['switch -c feature', 'commit', 'switch main', 'merge feature'],
  'merge: 머지 커밋': [...diverged, 'merge feature'],
  'merge --no-ff': ['switch -c feature', 'commit', 'switch main', 'merge --no-ff feature'],
  'merge: 이미 합쳐짐': ['branch feature', 'commit', 'merge feature'],
  'merge 뒤 반대쪽 fast-forward': [...diverged, 'merge feature', 'switch feature', 'merge main'],
  'merge: 브랜치 두 개 차례로': ['switch -c a', 'commit', 'switch -c b', 'commit', 'switch main', 'merge a', 'merge b'],
  'rebase: 갈라진 브랜치 옮기기': [...diverged, 'switch feature', 'rebase main'],
  'rebase: 이미 반영된 커밋 건너뛰기': [...diverged, 'cherry-pick feature', 'switch feature', 'rebase main'],
  'rebase: 머지 커밋 빼고 펴기': [
    'switch -c feature',
    'commit',
    'switch -c side',
    'commit',
    'switch feature',
    'commit',
    'merge side',
    'switch main',
    'commit',
    'switch feature',
    'rebase main',
  ],
  'rebase: 뒤처지기만 했으면 앞으로': ['switch -c feature', 'switch main', 'commit', 'switch feature', 'rebase main'],
  'rebase: 복사본을 다시 rebase': [
    ...diverged,
    'switch feature',
    'rebase main',
    'switch main',
    'commit',
    'switch feature',
    'rebase main',
  ],
  'rebase 뒤 fast-forward 머지': [
    ...diverged,
    'switch feature',
    'commit',
    'rebase main',
    'switch main',
    'merge feature',
  ],
  'cherry-pick: 여러 개': ['switch -c feature', 'commit', 'commit', 'switch main', 'cherry-pick C2 C3'],
  'cherry-pick: 이미 있는 커밋은 실패': ['commit', 'cherry-pick C2'],
  'reset --hard': ['commit', 'commit', 'reset --hard HEAD~1'],
  'reset --soft 두 칸': ['commit', 'commit', 'reset --soft HEAD~2'],
  'reset 다른 브랜치 위치로': [...diverged, 'reset --hard feature'],
  revert: ['commit', 'revert HEAD'],
  'revert: 머지 커밋은 실패': [...diverged, 'merge feature', 'revert HEAD'],
  'revert: 지금 기록에 없는 커밋은 실패': [...diverged, 'revert C2'],
  'detached 에서 커밋': ['commit', 'checkout C1', 'commit'],
  'detached 커밋을 머지': ['commit', 'switch --detach HEAD~1', 'commit', 'switch main', 'merge C3'],
  'checkout -b 시작점': ['commit', 'checkout -b feature C1', 'commit', 'switch main', 'merge feature'],
  '지난 커밋에서 브랜치': ['commit', 'commit', 'checkout HEAD~1', 'switch -c old', 'commit'],
  'branch -d: 안 합쳐지면 실패': ['switch -c feature', 'commit', 'switch main', 'branch -d feature'],
  'branch -D · -m': [
    'switch -c feature',
    'commit',
    'switch main',
    'branch -D feature',
    'branch x',
    'branch -m x y',
    'switch y',
    'commit',
  ],
  'switch - 왕복': ['switch -c feature', 'commit', 'switch -', 'commit', 'switch -', 'merge main'],
};

describe.skipIf(!hasGit)('실제 git 대조', () => {
  it('시나리오가 20개 이상 (M3 완료 기준)', () => {
    expect(Object.keys(SCENARIOS).length).toBeGreaterThanOrEqual(20);
  });

  it.each(Object.entries(SCENARIOS))('%s', (_, steps) => {
    check(steps);
  });
});
