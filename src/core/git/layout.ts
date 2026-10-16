import { execute } from './execute';
import { bySeq } from './graph';
import type { RepoState } from './types';

/** 커밋 하나의 자리: lane = 왼쪽부터 몇 번째 줄기, row = 위(시작 커밋)부터 몇 번째 줄 */
export type NodePos = { lane: number; row: number };
export type TreeLayout = Readonly<Record<string, NodePos>>;

/** 맨 왼쪽 레인을 지키는 브랜치 */
const TRUNK = new Set(['main', 'master']);

/**
 * 커밋 그래프 배치. previous 에 있던 커밋은 자리를 그대로 두고 새 커밋만 놓는다 —
 * 명령마다 그림이 다시 흩어지지 않게 (구현계획 M4).
 * - row: 부모 중 가장 아래 줄 + 1
 * - lane: main 이 가리키는 새 커밋은 0, 나머지는 부모 레인(0 이면 1부터). 차 있으면 오른쪽 빈 레인
 */
export function layoutTree(state: RepoState, previous: TreeLayout = {}): TreeLayout {
  const out: Record<string, NodePos> = {};
  const taken = new Set<string>();
  for (const [id, pos] of Object.entries(previous)) {
    if (!state.commits[id]) continue;
    out[id] = pos;
    taken.add(`${pos.lane}:${pos.row}`);
  }

  const onTrunk = new Set(
    Object.entries(state.branches)
      .filter(([name]) => TRUNK.has(name))
      .map(([, id]) => id),
  );

  for (const id of Object.keys(state.commits).sort(bySeq)) {
    if (out[id]) continue;
    const parents = state.commits[id]!.parents.map((p) => out[p]!);
    const row = parents.length === 0 ? 0 : Math.max(...parents.map((p) => p.row)) + 1;
    const parentLane = parents[0]?.lane ?? 0;
    let lane = onTrunk.has(id) || parents.length === 0 ? 0 : Math.max(parentLane, 1);
    while (taken.has(`${lane}:${row}`)) lane += 1;
    out[id] = { lane, row };
    taken.add(`${lane}:${row}`);
  }
  return out;
}

/** 시작 상태에서 명령 목록을 차례로 실행하며 레이아웃을 이어 간다 (목표 트리 · 미션 검증용) */
export function layoutSteps(start: RepoState, commands: readonly string[]) {
  const states = [start];
  let layout = layoutTree(start);
  for (const command of commands) {
    const r = execute(states.at(-1)!, command);
    if (r.error) throw new Error(`${command}: ${r.error.message}`);
    states.push(r.state);
    layout = layoutTree(r.state, layout);
  }
  return { states, layout, state: states.at(-1)! };
}
