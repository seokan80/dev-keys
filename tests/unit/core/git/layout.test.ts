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

describe('layoutTree', () => {
  it('시작 커밋은 맨 위 왼쪽', () => {
    expect(layoutTree(initialRepo())).toEqual({ c1: { lane: 0, row: 0 } });
  });

  it('main 의 커밋은 왼쪽 레인에 쌓이고, 다른 브랜치는 오른쪽 레인', () => {
    const { layout } = play('switch -c feature', 'commit', 'switch main', 'commit');
    expect(layout).toEqual({
      c1: { lane: 0, row: 0 },
      c2: { lane: 1, row: 1 }, // feature 가 먼저 커밋해도
      c3: { lane: 0, row: 1 }, // main 은 왼쪽을 지킨다
    });
  });

  it('같은 브랜치의 다음 커밋은 부모와 같은 레인, 한 줄 아래', () => {
    const { layout } = play('switch -c feature', 'commit', 'commit');
    expect(layout.c3).toEqual({ lane: 1, row: 2 });
  });

  it('머지 커밋은 부모들보다 한 줄 아래', () => {
    const { layout } = play('switch -c feature', 'commit', 'commit', 'switch main', 'commit', 'merge feature');
    expect(layout.c5).toEqual({ lane: 0, row: 3 });
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
      for (const [id, pos] of Object.entries(history[i - 1]!))
        expect(history[i]![id], `${i}번째 명령 뒤 ${id}`).toEqual(pos);
    }
  });

  it('rebase 복사본은 한 레인에 이어지고, 고아가 된 원본도 자리를 지킨다', () => {
    const { layout } = play(
      'switch -c feature',
      'commit',
      'commit',
      'switch main',
      'commit',
      'switch feature',
      'rebase main',
    );
    // main: C1 → C4(0,1). 원본 C2(1,1) C3(1,2) 는 고아가 돼도 자리를 지키고,
    // 복사본 C2'(c5) C3'(c6) 은 그 오른쪽 레인에 이어 붙는다 — 흐린 원본 옆에 옮겨진 모습
    expect(layout.c2).toEqual({ lane: 1, row: 1 });
    expect(layout.c3).toEqual({ lane: 1, row: 2 });
    expect(layout.c5).toEqual({ lane: 2, row: 2 });
    expect(layout.c6).toEqual({ lane: 2, row: 3 });
  });

  it('자리가 차 있으면 오른쪽 빈 레인으로', () => {
    const { layout } = play('switch -c a', 'commit', 'switch main', 'switch -c b', 'commit');
    expect(layout.c2).toEqual({ lane: 1, row: 1 });
    expect(layout.c3).toEqual({ lane: 2, row: 1 });
  });
});

describe('layoutSteps', () => {
  it('명령 목록을 차례로 실행한 상태들의 레이아웃을 이어 준다 (목표 트리용)', () => {
    const start = initialRepo();
    const { states, layout } = layoutSteps(start, ['switch -c feature', 'commit', 'switch main', 'commit']);
    expect(states).toHaveLength(5);
    expect(layout).toEqual(play('switch -c feature', 'commit', 'switch main', 'commit').layout);
  });

  it('실패하는 명령이 있으면 알려 준다', () => {
    expect(() => layoutSteps(initialRepo(), ['commit', 'switch nope'])).toThrow(/switch nope/);
  });
});
