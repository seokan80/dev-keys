import { describe, expect, it } from 'vitest';
import { compare, execute, initialRepo, type RepoState } from '@core/git';

function from(state: RepoState, ...commands: string[]): RepoState {
  return commands.reduce((s, c) => {
    const r = execute(s, c);
    if (r.error) throw new Error(`${c}: ${r.error.message}`);
    return r.state;
  }, state);
}

// 미션 시작: main 과 feature 가 C1 에서 갈라져 있다 (main: C3, feature: C2)
const start = from(initialRepo(), 'switch -c feature', 'commit', 'switch main', 'commit');

describe('compare', () => {
  it('같은 결과면 풀이가 달라도 같다 — rebase 와 cherry-pick 으로 옮기기', () => {
    const goal = from(start, 'switch feature', 'rebase main');
    const other = from(start, 'switch feature', 'reset --hard main', 'cherry-pick C2');
    expect(compare(other, goal, start)).toEqual({ equal: true, diffs: [] });
  });

  it('새 커밋을 만든 순서가 달라도(내부 id 가 달라도) 모양이 같으면 같다', () => {
    const a = from(start, 'commit', 'switch feature', 'commit');
    const b = from(start, 'switch feature', 'commit', 'switch main', 'commit', 'switch feature');
    expect(compare(a, b, start).equal).toBe(true);
  });

  it('rebase 와 merge 는 다르다', () => {
    const goal = from(start, 'switch feature', 'rebase main');
    const merged = from(start, 'switch feature', 'merge main');
    const r = compare(merged, goal, start);
    expect(r.equal).toBe(false);
    expect(r.diffs).toEqual(['feature 가 가리키는 커밋이 목표와 다르다']);
  });

  it('브랜치가 모자라거나 남으면 알려 준다', () => {
    const goal = from(start, 'branch hotfix');
    expect(compare(start, goal, start).diffs).toEqual(['hotfix 브랜치가 없다']);
    expect(compare(goal, start, start).diffs).toEqual(['목표에 없는 브랜치 hotfix 가 있다']);
  });

  it('HEAD 가 다르면 알려 준다', () => {
    const goal = from(start, 'switch feature');
    expect(compare(start, goal, start).diffs).toEqual(['HEAD 가 목표와 다르다 (목표: feature)']);
    const detached = from(start, 'checkout C1');
    expect(compare(detached, start, start).diffs).toEqual(['HEAD 가 목표와 다르다 (목표: main)']);
    expect(compare(start, detached, start).diffs).toEqual(['HEAD 가 목표와 다르다 (목표: 커밋을 바로 가리킴)']);
  });

  it('고아 커밋은 보지 않는다', () => {
    const a = from(start, 'commit', 'reset --hard HEAD~1');
    expect(compare(a, start, start).equal).toBe(true);
  });

  it('새 커밋과 복사본 · 되돌림은 서로 다르다', () => {
    const picked = from(start, 'cherry-pick C2');
    const fresh = from(start, 'commit');
    const reverted = from(start, 'revert C3');
    expect(compare(picked, fresh, start).equal).toBe(false);
    expect(compare(reverted, fresh, start).equal).toBe(false);
  });
});
