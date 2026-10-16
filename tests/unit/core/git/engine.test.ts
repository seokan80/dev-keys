import { describe, expect, it } from 'vitest';
import { execute, initialRepo, renderText, resolve, type ExecResult, type RepoState } from '@core/git';

/** 명령을 차례로 실행한다. 오류가 나면 시험 실패 */
function run(...commands: string[]): { state: RepoState; last: ExecResult } {
  let state = initialRepo();
  let last: ExecResult | null = null;
  for (const command of commands) {
    last = execute(state, command);
    if (last.error) throw new Error(`${command}: ${last.error.message}`);
    state = last.state;
  }
  return { state, last: last! };
}

/** 마지막 명령만 오류를 기대한다 */
function fails(commands: string[], command: string) {
  const { state } = run(...commands);
  const r = execute(state, command);
  expect(r.error, command).not.toBeNull();
  expect(r.state).toBe(state);
  expect(r.events).toEqual([]);
  return r.error!;
}

const graph = (...commands: string[]) => renderText(run(...commands).state);

describe('시작 저장소', () => {
  it('main 브랜치에 커밋 C1 하나', () => {
    expect(renderText(initialRepo())).toBe('C1 <- - (HEAD -> main)');
  });
});

describe('명령 해석', () => {
  it('앞의 git 은 붙여도 안 붙여도 된다', () => {
    expect(graph('git commit')).toBe(graph('commit'));
  });

  it('따옴표 안의 공백은 한 덩어리', () => {
    expect(run('commit -m "add login page"').last.output).toBe('[main C2] add login page');
    expect(run("commit -m 'fix: typo'").last.output).toBe('[main C2] fix: typo');
  });

  it('닫히지 않은 따옴표 · 빈 입력', () => {
    expect(fails([], 'commit -m "oops').hint).toMatch(/따옴표/);
    expect(fails([], '   ').hint).toMatch(/명령/);
    expect(fails([], 'git').hint).toMatch(/명령/);
  });

  it('없는 명령은 실제 git 처럼, 지원하지 않는 명령은 이유를 알려 준다', () => {
    expect(fails([], 'swich main').message).toBe("git: 'swich' is not a git command. See 'git --help'.");
    expect(fails([], 'git push origin main').hint).toMatch(/원격/);
    expect(fails([], 'git status').hint).toMatch(/트리/);
  });

  it('지원하지 않는 옵션', () => {
    const e = fails([], 'commit --amend');
    expect(e.message).toBe("error: unknown option '--amend'");
    expect(e.hint).toMatch(/지원하지 않는 옵션/);
  });
});

describe('참조', () => {
  const base = ['commit', 'commit', 'commit']; // C1 - C2 - C3 - C4

  it('HEAD~n · HEAD^ · 브랜치~n · 라벨(대소문자 무관)', () => {
    expect(run(...base, 'checkout HEAD~2').state.head).toEqual({ type: 'detached', commit: 'c2' });
    expect(run(...base, 'checkout HEAD^').state.head).toEqual({ type: 'detached', commit: 'c3' });
    expect(run(...base, 'checkout main~3').state.head).toEqual({ type: 'detached', commit: 'c1' });
    expect(run(...base, 'checkout c2').state.head).toEqual({ type: 'detached', commit: 'c2' });
    expect(run(...base, 'checkout HEAD~1^').state.head).toEqual({ type: 'detached', commit: 'c2' });
  });

  it('뿌리를 넘어가면 오류', () => {
    expect(fails(base, 'reset HEAD~5').message).toMatch(/unknown revision/);
  });

  it('^2 는 머지 커밋의 두 번째 부모', () => {
    const { state } = run('switch -c feature', 'commit', 'switch main', 'commit', 'merge feature', 'checkout HEAD^2');
    expect(state.head).toEqual({ type: 'detached', commit: 'c2' });
  });
});

describe('commit', () => {
  it('지금 브랜치에 새 커밋을 쌓고 브랜치를 옮긴다', () => {
    const { state, last } = run('commit -m "first"');
    expect(renderText(state)).toBe('C2 <- C1 (HEAD -> main)\nC1 <- -');
    expect(last.output).toBe('[main C2] first');
    expect(last.events).toEqual([
      { type: 'commit', id: 'c2' },
      { type: 'branch', name: 'main', from: 'c1', to: 'c2' },
    ]);
  });

  it('-a · -am · --allow-empty 는 받아 둔다 (스테이징이 없어 결과는 같다)', () => {
    expect(graph('commit -am "x"')).toBe(graph('commit -m "x"'));
    expect(graph('commit -a --allow-empty')).toBe(graph('commit'));
  });

  it('-m 뒤에 메시지가 없으면 오류', () => {
    expect(fails([], 'commit -m').message).toMatch(/requires a value/);
  });

  it('detached HEAD 에서는 HEAD 만 앞으로 간다', () => {
    const { state, last } = run('commit', 'checkout C1', 'commit');
    expect(state.head).toEqual({ type: 'detached', commit: 'c3' });
    expect(state.branches.main).toBe('c2');
    expect(last.output).toBe('[detached HEAD C3] ');
  });
});

describe('branch', () => {
  it('만들기만 하고 이동하지 않는다', () => {
    const { state, last } = run('branch feature');
    expect(state.branches.feature).toBe('c1');
    expect(state.head).toEqual({ type: 'branch', name: 'main' });
    expect(last.events).toEqual([{ type: 'branch', name: 'feature', from: null, to: 'c1' }]);
  });

  it('시작 커밋을 줄 수 있다', () => {
    expect(run('commit', 'branch old C1').state.branches.old).toBe('c1');
  });

  it('목록: 이름순, 지금 브랜치에 *', () => {
    expect(run('branch feature', 'branch').last.output).toBe('  feature\n* main');
    expect(run('checkout C1', 'branch').last.output).toBe('* (HEAD detached at C1)\n  main');
  });

  it('이미 있는 이름 · 잘못된 이름 · 없는 시작점', () => {
    expect(fails(['branch feature'], 'branch feature').message).toBe("fatal: a branch named 'feature' already exists");
    expect(fails([], 'branch a..b').message).toBe("fatal: 'a..b' is not a valid branch name");
    expect(fails([], 'branch x nope').message).toBe("fatal: not a valid object name: 'nope'");
  });

  it('-d: 합쳐진 브랜치만 지운다', () => {
    expect(run('branch feature', 'branch -d feature').last.output).toBe('Deleted branch feature (was C1).');
    const e = fails(['switch -c feature', 'commit', 'switch main'], 'branch -d feature');
    expect(e.message).toBe("error: the branch 'feature' is not fully merged");
    expect(e.hint).toMatch(/-D/);
  });

  it('-D: 강제로 지우고, 그 브랜치에만 있던 커밋은 고아가 된다', () => {
    const { last } = run('switch -c feature', 'commit', 'switch main', 'branch -D feature');
    expect(last.events).toEqual([
      { type: 'branch', name: 'feature', from: 'c2', to: null },
      { type: 'orphaned', ids: ['c2'] },
    ]);
  });

  it('지금 브랜치 · 없는 브랜치는 지울 수 없다', () => {
    expect(fails([], 'branch -d main').message).toMatch(/cannot delete branch 'main'/);
    expect(fails([], 'branch -D nope').message).toBe("error: branch 'nope' not found");
  });

  it('-m: 이름 바꾸기. 지금 브랜치면 HEAD 도 따라간다', () => {
    expect(run('branch -m trunk').state.head).toEqual({ type: 'branch', name: 'trunk' });
    const { state } = run('branch feature', 'branch -m feature join');
    expect(state.branches).toEqual({ main: 'c1', join: 'c1' });
    expect(fails(['branch a'], 'branch -m a main').message).toBe("fatal: a branch named 'main' already exists");
  });
});

describe('switch · checkout', () => {
  it('브랜치로 이동', () => {
    const { state, last } = run('branch feature', 'switch feature');
    expect(state.head).toEqual({ type: 'branch', name: 'feature' });
    expect(last.output).toBe("Switched to branch 'feature'");
    expect(last.events).toEqual([
      { type: 'head', from: { type: 'branch', name: 'main' }, to: { type: 'branch', name: 'feature' } },
    ]);
    expect(run('switch main').last.output).toBe("Already on 'main'");
  });

  it('switch 는 브랜치만 받는다 — 커밋은 --detach', () => {
    expect(fails([], 'switch nope').message).toBe('fatal: invalid reference: nope');
    const e = fails([], 'switch C1');
    expect(e.message).toBe("fatal: a branch is expected, got commit 'C1'");
    expect(e.hint).toMatch(/--detach/);
    expect(run('switch --detach C1').state.head).toEqual({ type: 'detached', commit: 'c1' });
  });

  it('-c 만들면서 이동, 이미 있으면 오류', () => {
    expect(run('switch -c feature').last.output).toBe("Switched to a new branch 'feature'");
    expect(fails(['branch feature'], 'switch -c feature').message).toMatch(/already exists/);
  });

  it('- 는 바로 전 브랜치', () => {
    expect(run('switch -c feature', 'switch main', 'switch -').state.head).toEqual({ type: 'branch', name: 'feature' });
    expect(run('switch -c feature', 'checkout -').state.head).toEqual({ type: 'branch', name: 'main' });
    expect(fails([], 'switch -').message).toBe('fatal: invalid reference: @{-1}');
  });

  it('checkout 은 커밋도 받는다 (detached), 없는 이름은 pathspec 오류', () => {
    expect(run('commit', 'checkout C1').last.output).toBe('HEAD is now at C1 ');
    expect(fails([], 'checkout nope').message).toBe("error: pathspec 'nope' did not match any file(s) known to git");
  });

  it.each([
    [['switch -c f'], ['checkout -b f']],
    [
      ['branch f', 'switch f'],
      ['branch f', 'checkout f'],
    ],
    [
      ['commit', 'switch --detach C1'],
      ['commit', 'checkout C1'],
    ],
    [
      ['commit', 'switch -c f C1'],
      ['commit', 'checkout -b f C1'],
    ],
  ])('동의어: %j = %j', (a, b) => {
    const x = run(...a).state;
    const y = run(...b).state;
    expect(renderText(x)).toBe(renderText(y));
    expect(x.head).toEqual(y.head);
  });
});

describe('merge', () => {
  it('이미 합쳐져 있으면 아무것도 안 한다', () => {
    const { last } = run('branch feature', 'commit', 'merge feature');
    expect(last.output).toBe('Already up to date.');
    expect(last.events).toEqual([]);
  });

  it('뒤처져 있기만 하면 fast-forward — 새 커밋 없이 브랜치만 옮긴다', () => {
    const { state, last } = run('switch -c feature', 'commit', 'commit', 'switch main', 'merge feature');
    expect(state.branches.main).toBe('c3');
    expect(last.output).toBe('Updating C1..C3\nFast-forward');
    expect(Object.keys(state.commits)).toHaveLength(3);
  });

  it('--no-ff 는 fast-forward 가 되어도 머지 커밋을 만든다', () => {
    expect(graph('switch -c feature', 'commit', 'switch main', 'merge --no-ff feature')).toBe(
      ['C3 <- C1 C2 (HEAD -> main)', 'C2 <- C1 (feature)', 'C1 <- -'].join('\n'),
    );
  });

  it('갈라졌으면 머지 커밋 — 첫 부모는 지금 브랜치', () => {
    const { state, last } = run('switch -c feature', 'commit', 'switch main', 'commit', 'merge feature');
    expect(renderText(state).split('\n')[0]).toBe('C4 <- C3 C2 (HEAD -> main)');
    expect(state.commits.c4!.message).toBe("Merge branch 'feature'");
    expect(last.output).toBe("Merge made by the 'ort' strategy.");
  });

  it('--ff-only 로 갈라졌으면 오류, 없는 대상도 오류', () => {
    const diverged = ['switch -c feature', 'commit', 'switch main', 'commit'];
    expect(fails(diverged, 'merge --ff-only feature').message).toBe('fatal: Not possible to fast-forward, aborting.');
    expect(fails([], 'merge nope').message).toBe('merge: nope - not something we can merge');
  });
});

describe('rebase', () => {
  const diverged = ['switch -c feature', 'commit', 'switch main', 'commit', 'switch feature'];

  it("지금 브랜치의 커밋을 대상 끝에 복사(C2')해 다시 쌓고, 원본은 고아가 된다", () => {
    const { state, last } = run(...diverged, 'rebase main');
    expect(renderText(state)).toBe(["C2' <- C3 (HEAD -> feature)", 'C3 <- C1 (main)', 'C1 <- -'].join('\n'));
    expect(state.commits.c4!.origin).toEqual({ kind: 'copy', of: 'c2' });
    expect(last.output).toBe('Successfully rebased and updated refs/heads/feature.');
    expect(last.events).toEqual([
      { type: 'copy', from: 'c2', to: 'c4' },
      { type: 'branch', name: 'feature', from: 'c2', to: 'c4' },
      { type: 'orphaned', ids: ['c2'] },
    ]);
  });

  it('이미 대상 위에 있으면 그대로, 뒤처져 있기만 하면 앞으로', () => {
    expect(run('branch feature', 'commit', 'rebase feature').last.output).toBe('Current branch main is up to date.');
    const { state } = run('switch -c feature', 'switch main', 'commit', 'switch feature', 'rebase main');
    expect(state.branches.feature).toBe('c2');
  });

  it('대상에 이미 같은 변경(복사본)이 있으면 건너뛴다', () => {
    const { state } = run(...diverged, 'switch main', 'cherry-pick feature', 'switch feature', 'rebase main');
    expect(state.branches.feature).toBe(state.branches.main);
  });

  it('머지 커밋은 빼고 한 줄로 편다', () => {
    const { state } = run(
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
    );
    // main: C1 - C6, feature 의 C2 C4 C3 (머지 C5 제외) 가 C6 위로
    expect(renderText(state).split('\n').slice(0, 4)).toEqual([
      "C3' <- C4' (HEAD -> feature)",
      "C4' <- C2'",
      "C2' <- C6",
      'C6 <- C1 (main)',
    ]);
  });

  it("복사본을 다시 복사하면 C2''", () => {
    const { state } = run(...diverged, 'rebase main', 'switch main', 'commit', 'switch feature', 'rebase main');
    expect(state.commits[state.branches.feature!]!.label).toBe("C2''");
  });

  it('없는 대상', () => {
    expect(fails([], 'rebase nope').message).toBe("fatal: invalid upstream 'nope'");
  });
});

describe('cherry-pick', () => {
  it('커밋 하나(또는 여럿)를 지금 브랜치 위에 복사한다', () => {
    const { state, last } = run('switch -c feature', 'commit', 'commit', 'switch main', 'cherry-pick C2 C3');
    expect(renderText(state).split('\n').slice(0, 2)).toEqual(["C3' <- C2' (HEAD -> main)", "C2' <- C1"]);
    expect(last.output).toBe("[main C2'] \n[main C3'] ");
  });

  it('머지 커밋 · 이미 있는 변경 · 없는 커밋은 오류', () => {
    const merged = ['switch -c feature', 'commit', 'switch main', 'commit', 'merge feature', 'switch feature'];
    expect(fails(merged, 'cherry-pick main').message).toBe('error: commit C4 is a merge but no -m option was given.');
    expect(fails(['commit'], 'cherry-pick C2').message).toMatch(/now empty/);
    expect(fails([], 'cherry-pick nope').message).toBe("fatal: bad revision 'nope'");
  });
});

describe('reset', () => {
  it('지금 브랜치를 옮긴다. 모드는 정보로만 남는다 (스테이징이 없어 결과 상태가 같다)', () => {
    const soft = run('commit', 'commit', 'reset --soft HEAD~2');
    const hard = run('commit', 'commit', 'reset --hard HEAD~2');
    const mixed = run('commit', 'commit', 'reset HEAD~2');
    expect(renderText(soft.state)).toBe('C1 <- - (HEAD -> main)');
    expect(renderText(hard.state)).toBe(renderText(soft.state));
    expect([soft, mixed, hard].map((r) => r.last.info.resetMode)).toEqual(['soft', 'mixed', 'hard']);
    expect(hard.last.output).toBe('HEAD is now at C1 ');
    expect(soft.last.output).toBe('');
    expect(soft.last.events.at(-1)).toEqual({ type: 'orphaned', ids: ['c2', 'c3'] });
  });

  it('detached 에서는 HEAD 를 옮긴다', () => {
    expect(run('commit', 'checkout C2', 'reset C1').state.head).toEqual({ type: 'detached', commit: 'c1' });
  });

  it('없는 대상', () => {
    expect(fails([], 'reset --hard nope').message).toMatch(/unknown revision/);
  });
});

describe('revert', () => {
  it('되돌리는 새 커밋을 쌓는다', () => {
    const { state, last } = run('commit -m "add login"', 'revert HEAD');
    expect(state.commits.c3).toMatchObject({ parents: ['c2'], origin: { kind: 'revert', of: 'c2' } });
    expect(last.output).toBe('[main C3] Revert "add login"');
  });

  it('머지 커밋은 오류', () => {
    const merged = ['switch -c feature', 'commit', 'switch main', 'commit', 'merge feature'];
    expect(fails(merged, 'revert HEAD').message).toBe('error: commit C4 is a merge but no -m option was given.');
  });
});

describe('참조 해석 (resolve)', () => {
  const { state } = run('commit', 'commit');
  it.each([
    ['', null],
    ['nope~1', null],
    ['HEAD^0', 'c3'],
    ['C1^2', null],
    ['C1~1', null],
    ['@', 'c3'],
  ])('%s → %s', (ref, id) => {
    expect(resolve(state, ref)).toBe(id);
  });
});

describe('드문 오류 경로', () => {
  it.each([
    [[], 'commit README.md', /pathspec 'README.md'/],
    [[], 'branch a b c', /too many arguments/],
    [[], 'branch -d', /branch name required/],
    [['checkout C1'], 'branch -m x', /not on any/],
    [[], 'branch -m nope x', /refs\/heads\/nope not found/],
    [[], 'branch -m main a..b', /not a valid branch name/],
    [[], 'branch -m', /too many arguments/],
    [[], 'switch', /missing branch/],
    [[], 'switch a b', /too many arguments/],
    [[], 'switch -c a b c', /too many arguments/],
    [[], 'switch -c a..b', /not a valid branch name/],
    [[], 'switch -c x nope', /invalid reference: nope/],
    [[], 'switch --detach nope', /invalid reference: nope/],
    [[], 'checkout', /must specify a branch/],
    [[], 'checkout a b', /too many arguments/],
    [[], 'checkout -b a b c', /too many arguments/],
    [[], 'checkout -', /pathspec '-'/],
    [[], 'merge', /No remote/],
    [[], 'merge a b', /too many arguments/],
    [[], 'rebase', /no tracking information/],
    [[], 'rebase a b', /too many arguments/],
    [[], 'cherry-pick', /empty commit set/],
    [[], 'revert nope', /bad revision/],
    [[], 'reset --soft --hard', /mutually exclusive/],
    [[], 'reset a b', /too many arguments/],
    [[], 'merge --squash x', /unknown option '--squash'/],
  ])('%j 다음 %s', (before, command, message) => {
    expect(fails(before, command).message).toMatch(message);
  });
});

describe('그 밖의 동작', () => {
  it('되돌림 커밋은 원본 변경이 있는 브랜치로만 복사된다 (실제 git 은 없으면 충돌)', () => {
    const base = ['commit', 'switch -c x', 'switch main', 'revert HEAD'];
    const { state } = run(...base, 'switch x', 'cherry-pick main');
    expect(state.commits[state.branches.x!]!.origin).toEqual({ kind: 'copy', of: 'c3' });
    expect(fails([...base, 'switch x', 'cherry-pick main'], 'cherry-pick main').message).toMatch(/now empty/);
    const e = fails([...base, 'switch -c y C1'], 'cherry-pick main');
    expect(e.message).toMatch(/could not apply C3/);
    expect(e.hint).toMatch(/지금 브랜치에 없는/);
  });

  it('revert 는 지금 기록에 있고 아직 되돌리지 않은 커밋만', () => {
    const e = fails(['switch -c feature', 'commit', 'switch main'], 'revert C2');
    expect(e.message).toMatch(/could not revert C2/);
    expect(e.hint).toMatch(/없는 커밋/);
    expect(fails(['commit', 'revert C2'], 'revert C2').hint).toMatch(/이미 되돌린/);
    expect(run('commit', 'revert C2', 'revert C3').state.commits.c4!.origin).toEqual({ kind: 'revert', of: 'c3' });
  });

  it('detached 에서 rebase · merge · cherry-pick', () => {
    const base = ['switch -c feature', 'commit', 'switch main', 'commit', 'checkout C2'];
    expect(run(...base, 'rebase main').last.output).toBe('Successfully rebased and updated detached HEAD.');
    expect(run(...base, 'merge main').state.commits.c4!.message).toBe("Merge branch 'main'");
    expect(run(...base, 'cherry-pick main').last.output).toBe("[detached HEAD C3'] ");
  });

  it('main 이 아닌 브랜치로 합치면 메시지에 into, 커밋을 합치면 Merge commit', () => {
    const base = ['switch -c feature', 'commit', 'switch main', 'commit', 'switch feature'];
    expect(run(...base, 'merge main').state.commits.c4!.message).toBe("Merge branch 'main' into feature");
    expect(run(...base, 'merge C3').state.commits.c4!.message).toBe("Merge commit 'C3'");
    expect(run(...base, 'merge -m "join" main').state.commits.c4!.message).toBe('join');
  });

  it('switch - 로 detached 였던 곳으로는 못 가고, checkout - 은 간다', () => {
    expect(fails(['commit', 'checkout C1', 'switch main'], 'switch -').message).toMatch(/a branch is expected/);
    expect(run('commit', 'checkout C1', 'switch main', 'checkout -').state.head).toEqual({
      type: 'detached',
      commit: 'c1',
    });
  });

  it('branch --list · switch --detach (대상 없음 = 지금 커밋) · checkout --detach <브랜치>', () => {
    expect(run('branch --list').last.output).toBe('* main');
    expect(run('switch --detach').state.head).toEqual({ type: 'detached', commit: 'c1' });
    expect(run('checkout --detach main').state.head).toEqual({ type: 'detached', commit: 'c1' });
  });
});
