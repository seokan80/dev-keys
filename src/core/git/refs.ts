import { headCommit } from './graph';
import type { RepoState } from './types';

/**
 * 참조를 커밋 id 로: HEAD · 브랜치 이름 · 라벨(C3, C3', 대소문자 무관) 뒤에 ~n · ^n 를 이어 붙일 수 있다.
 * 못 찾으면 null
 */
export function resolve(state: RepoState, ref: string): string | null {
  const m = /^(.+?)((?:[~^]\d*)*)$/.exec(ref);
  if (!m) return null;
  const [, base, suffix] = m as unknown as [string, string, string];

  let id: string | null;
  if (base === 'HEAD' || base === '@') id = headCommit(state);
  else if (state.branches[base] !== undefined) id = state.branches[base]!;
  else {
    const lower = base.toLowerCase();
    id = Object.values(state.commits).find((c) => c.label.toLowerCase() === lower)?.id ?? null;
  }

  for (const [, op, digits] of suffix.matchAll(/([~^])(\d*)/g)) {
    if (id === null) return null;
    const n = digits === '' ? 1 : Number(digits);
    if (op === '~') {
      for (let k = 0; k < n && id !== null; k++) id = state.commits[id]!.parents[0] ?? null;
    } else if (n > 0) {
      id = state.commits[id]!.parents[n - 1] ?? null;
    }
  }
  return id;
}
