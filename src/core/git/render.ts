import { bySeq, headBranch, headCommit, reachable } from './graph';
import type { RepoState } from './types';

/**
 * 텍스트 그래프 (시험 · 디버깅용). 닿는 커밋을 최신부터 한 줄씩:
 * `C4 <- C3 C2 (HEAD -> main, feature)` — 부모가 없으면 `-`, detached 면 `HEAD`
 */
export function renderText(state: RepoState): string {
  const current = headBranch(state);
  const head = headCommit(state);
  return [...reachable(state)]
    .sort(bySeq)
    .reverse()
    .map((id) => {
      const c = state.commits[id]!;
      const parents = c.parents.map((p) => state.commits[p]!.label).join(' ') || '-';
      const names = Object.keys(state.branches)
        .filter((name) => state.branches[name] === id)
        .sort();
      const refs =
        current !== null
          ? [...(names.includes(current) ? [`HEAD -> ${current}`] : []), ...names.filter((n) => n !== current)]
          : [...(head === id ? ['HEAD'] : []), ...names];
      return `${c.label} <- ${parents}${refs.length > 0 ? ` (${refs.join(', ')})` : ''}`;
    })
    .join('\n');
}
