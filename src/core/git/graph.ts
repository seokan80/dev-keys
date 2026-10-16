import type { RepoState } from './types';

/** 커밋 id 의 만든 순서 ('c12' → 12) */
export const seqOf = (id: string) => Number(id.slice(1));
export const bySeq = (a: string, b: string) => seqOf(a) - seqOf(b);

export const headCommit = (state: RepoState): string =>
  state.head.type === 'branch' ? state.branches[state.head.name]! : state.head.commit;

export const headBranch = (state: RepoState): string | null => (state.head.type === 'branch' ? state.head.name : null);

export const labelOf = (state: RepoState, id: string) => state.commits[id]!.label;

/** id 와 그 조상 전부 */
export function ancestors(state: RepoState, id: string): Set<string> {
  const seen = new Set<string>();
  const stack = [id];
  while (stack.length > 0) {
    const c = stack.pop()!;
    if (seen.has(c)) continue;
    seen.add(c);
    stack.push(...state.commits[c]!.parents);
  }
  return seen;
}

/** a 가 b 의 조상이거나 b 자신인가 */
export const isAncestor = (state: RepoState, a: string, b: string) => ancestors(state, b).has(a);

/** 브랜치나 HEAD 에서 닿는 커밋 */
export function reachable(state: RepoState): Set<string> {
  const tips = [...Object.values(state.branches), headCommit(state)];
  const all = new Set<string>();
  for (const tip of tips) for (const id of ancestors(state, tip)) all.add(id);
  return all;
}

/**
 * 같은 변경인지 가리는 열쇠 (실제 git 의 patch-id 대신).
 * 복사본은 최초 원본과 같고, 되돌림은 "되돌림 + 원본" 이다.
 */
export function patchKey(state: RepoState, id: string): string {
  const origin = state.commits[id]!.origin;
  if (origin?.kind === 'copy') return patchKey(state, origin.of);
  if (origin?.kind === 'revert') return `revert:${patchKey(state, origin.of)}`;
  return id;
}
