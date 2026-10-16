import { headCommit } from './graph';
import type { RepoState } from './types';

/**
 * 커밋의 "모양" 서명. 시작 상태에 있던 커밋은 id 그대로, 새로 생긴 커밋은
 * 종류(새로 · 복사 · 되돌림) + 원본 서명 + 부모 서명으로 만든다.
 * 그래서 커밋을 만든 순서(내부 id)가 달라도 모양이 같으면 같은 서명이 된다 (구현계획 5.2)
 */
function signer(state: RepoState, base: ReadonlySet<string>) {
  const memo = new Map<string, string>();
  const sig = (id: string): string => {
    const hit = memo.get(id);
    if (hit) return hit;
    const c = state.commits[id]!;
    const value = base.has(id)
      ? `#${id}`
      : `${c.origin?.kind ?? 'new'}(${c.origin ? sig(c.origin.of) : ''}|${c.parents.map(sig).join(',')})`;
    memo.set(id, value);
    return value;
  };
  return sig;
}

export type CompareResult = { equal: boolean; diffs: string[] };

/**
 * 미션 채점: 결과 트리 비교. 어떤 명령을 썼든 같은 결과면 정답.
 * 브랜치 이름 집합, 브랜치마다 가리키는 커밋의 모양, HEAD 를 본다. 고아 커밋은 보지 않는다.
 */
export function compare(actual: RepoState, goal: RepoState, start: RepoState): CompareResult {
  const base = new Set(Object.keys(start.commits));
  const sa = signer(actual, base);
  const sg = signer(goal, base);
  const diffs: string[] = [];

  const mine = Object.keys(actual.branches).sort();
  const wanted = Object.keys(goal.branches).sort();
  for (const name of wanted) if (!mine.includes(name)) diffs.push(`${name} 브랜치가 없다`);
  for (const name of mine) if (!wanted.includes(name)) diffs.push(`목표에 없는 브랜치 ${name} 가 있다`);
  for (const name of wanted) {
    if (mine.includes(name) && sa(actual.branches[name]!) !== sg(goal.branches[name]!)) {
      diffs.push(`${name} 가 가리키는 커밋이 목표와 다르다`);
    }
  }

  const headSame =
    actual.head.type === 'branch' && goal.head.type === 'branch'
      ? actual.head.name === goal.head.name
      : actual.head.type === 'detached' && goal.head.type === 'detached'
        ? sa(headCommit(actual)) === sg(headCommit(goal))
        : false;
  if (!headSame) {
    diffs.push(`HEAD 가 목표와 다르다 (목표: ${goal.head.type === 'branch' ? goal.head.name : '커밋을 바로 가리킴'})`);
  }
  return { equal: diffs.length === 0, diffs };
}
