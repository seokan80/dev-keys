import { execute } from './execute';
import { bySeq } from './graph';
import type { RepoState } from './types';

/** 커밋 하나의 자리: lane = 왼쪽부터 몇 번째 줄기, row = 몇 번째로 생긴 커밋인가 (0 = 시작 커밋) */
export type NodePos = { lane: number; row: number };
export type TreeLayout = Readonly<Record<string, NodePos>>;

/** 맨 왼쪽 레인을 지키는 브랜치 */
const TRUNK = new Set(['main', 'master']);

/**
 * 커밋 그래프 배치 — SourceTree · IntelliJ 처럼 한 줄에 커밋 하나 (그림에서는 최신이 위).
 * previous 에 있던 커밋은 자리를 그대로 두고 새 커밋만 놓는다 — 명령마다 그림이 흩어지지 않게 (구현계획 M4).
 * - row: 생긴 순서. 새 커밋은 늘 맨 위 새 줄
 * - lane: main 이 가리키는 새 커밋은 0 부터, 나머지는 부모 레인(0 이면 1)부터 찾되,
 *   첫 부모와 잇는 선이 그 사이 다른 커밋을 지나가지 않는 레인(그 레인의 가장 위 커밋이 부모 줄 이하)을 고른다
 */
export function layoutTree(state: RepoState, previous: TreeLayout = {}): TreeLayout {
  const out: Record<string, NodePos> = {};
  const topOfLane = new Map<number, number>();
  const mark = (pos: NodePos) => topOfLane.set(pos.lane, Math.max(topOfLane.get(pos.lane) ?? -1, pos.row));
  let nextRow = 0;
  for (const [id, pos] of Object.entries(previous)) {
    if (!state.commits[id]) continue;
    out[id] = pos;
    mark(pos);
    nextRow = Math.max(nextRow, pos.row + 1);
  }

  const onTrunk = new Set(
    Object.entries(state.branches)
      .filter(([name]) => TRUNK.has(name))
      .map(([, id]) => id),
  );

  for (const id of Object.keys(state.commits).sort(bySeq)) {
    if (out[id]) continue;
    const parent = state.commits[id]!.parents[0];
    const from = parent === undefined ? undefined : out[parent];
    const row = nextRow;
    nextRow += 1;
    let lane = from === undefined || onTrunk.has(id) ? 0 : Math.max(from.lane, 1);
    const parentRow = from?.row ?? -1;
    while ((topOfLane.get(lane) ?? -1) > parentRow) lane += 1;
    out[id] = { lane, row };
    mark(out[id]);
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
