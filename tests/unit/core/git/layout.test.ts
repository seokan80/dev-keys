import { describe, expect, it } from 'vitest';
import { execute, initialRepo, layoutSteps, layoutTree, type RepoState, type TreeLayout } from '@core/git';

/** 명령마다 레이아웃을 이어 가며 실행한다 (화면에서와 같이) */
function play(...commands: string[]): { state: RepoState; layout: TreeLayout; history: TreeLayout[] } {
  let state = initialRepo();
  let layout = layoutTree(state);
  const history = [layout];
  for (const c of commands) {
    const r = execute(state, c);
    if (r.error) throw new Error(`${c}: ${r.error.message}`);
    state = r.state;
    layout = layoutTree(state, layout);
    history.push(layout);
  }
  return { state, layout, history };
}

describe('layoutTree — SourceTree · IntelliJ 처럼 한 줄에 커밋 하나', () => {
  it('시작 커밋은 0번 줄(그림에서 맨 아래), 왼쪽 레인', () => {
    expect(layoutTree(initialRepo())).toEqual({ c1: { lane: 0, row: 0 } });
  });

  it('줄은 커밋이 생긴 순서 — 한 줄에 커밋은 하나뿐', () => {
    const { layout } = play('switch -c a', 'commit', 'switch main', 'commit', 'switch -c b', 'commit', 'merge a');
    const rows = Object.values(layout).map((p) => p.row);
    expect(new Set(rows).size).toBe(rows.length);
    expect(
      Object.entries(layout)
        .sort((x, y) => x[1].row - y[1].row)
        .map(([id]) => id),
    ).toEqual(['c1', 'c2', 'c3', 'c4', 'c5']);
  });

  it('main 의 커밋은 왼쪽 레인을 지키고, 다른 브랜치는 오른쪽 레인', () => {
    const { layout } = play('switch -c feature', 'commit', 'switch main', 'commit');
    expect(layout).toEqual({
      c1: { lane: 0, row: 0 },
      c2: { lane: 1, row: 1 }, // feature 가 먼저 커밋해도
      c3: { lane: 0, row: 2 }, // main 은 왼쪽
    });
  });

  it('같은 브랜치의 다음 커밋은 부모와 같은 레인', () => {
    expect(play('switch -c feature', 'commit', 'commit').layout.c3).toEqual({ lane: 1, row: 2 });
  });

  it('머지 커밋은 main 레인 맨 위', () => {
    const { layout } = play('switch -c feature', 'commit', 'commit', 'switch main', 'commit', 'merge feature');
    expect(layout.c5).toEqual({ lane: 0, row: 4 });
  });

  it('부모와 잇는 선이 다른 커밋을 지나가지 않게 레인을 고른다', () => {
    // a 의 C2 가 레인 1 의 줄 1 에 있다. C1 에서 나온 b 의 C3 은 레인 1 로 가면 선이 C2 를 지나가므로 레인 2
    const { layout } = play('switch -c a', 'commit', 'switch main', 'switch -c b', 'commit');
    expect(layout.c2).toEqual({ lane: 1, row: 1 });
    expect(layout.c3).toEqual({ lane: 2, row: 2 });
    // reset 으로 main 을 되돌린 뒤의 새 커밋도 같은 이유로 비어 있는 레인으로
    expect(play('commit', 'commit', 'reset --hard C1', 'commit').layout.c4).toEqual({ lane: 1, row: 3 });
  });

  it('명령을 이어 가도 이미 그린 커밋의 자리는 바뀌지 않는다', () => {
    const { history } = play(
      'switch -c feature',
      'commit',
      'commit',
      'switch main',
      'commit',
      'switch feature',
      'rebase main',
      'switch main',
      'merge feature',
      'branch -d feature',
      'switch -c hotfix C1',
      'commit',
      'reset --hard HEAD~1',
    );
    for (let i = 1; i < history.length; i++) {
      for (const [id, pos] of Object.entries(history[i - 1]!)) {
        expect(history[i]![id], `${i}번째 명령 뒤 ${id}`).toEqual(pos);
      }
    }
  });

  it('rebase 복사본은 새 줄에 이어 쌓이고, 고아가 된 원본도 자리를 지킨다', () => {
    const { layout } = play(
      'switch -c feature',
      'commit',
      'commit',
      'switch main',
      'commit',
      'switch feature',
      'rebase main',
    );
    expect(layout).toEqual({
      c1: { lane: 0, row: 0 },
      c2: { lane: 1, row: 1 },
      c3: { lane: 1, row: 2 },
      c4: { lane: 0, row: 3 },
      c5: { lane: 1, row: 4 }, // C2'
      c6: { lane: 1, row: 5 }, // C3'
    });
  });
});

describe('layoutSteps', () => {
  it('명령 목록을 차례로 실행한 상태들의 레이아웃을 이어 준다 (목표 트리용)', () => {
    const { states, layout } = layoutSteps(initialRepo(), ['switch -c feature', 'commit', 'switch main', 'commit']);
    expect(states).toHaveLength(5);
    expect(layout).toEqual(play('switch -c feature', 'commit', 'switch main', 'commit').layout);
  });

  it('실패하는 명령이 있으면 알려 준다', () => {
    expect(() => layoutSteps(initialRepo(), ['commit', 'switch nope'])).toThrow(/switch nope/);
  });
});
