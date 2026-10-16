import { ancestors, headBranch, headCommit, isAncestor, patchKey } from '../graph';
import { isError, parseOptions } from '../parse';
import { resolve } from '../refs';
import { Tx } from '../state';
import type { RepoState } from '../types';
import { tooManyArgs, unchanged, type Handler } from './common';

/**
 * 다시 쌓을 순서 (오래된 것부터). 실제 git 처럼 위상 순서로 걷되 한 줄기를 끝까지 따라간 뒤 다른 줄기로 간다:
 * 최신(tip)에서 스택으로 걸으며 부모를 순서대로 쌓으면 두 번째 부모 쪽이 먼저 나온다 — 이를 뒤집는다.
 */
function replayOrder(state: RepoState, set: Set<string>, tip: string): string[] {
  if (!set.has(tip)) return [];
  const children = new Map<string, number>();
  for (const id of set) {
    for (const p of state.commits[id]!.parents) if (set.has(p)) children.set(p, (children.get(p) ?? 0) + 1);
  }
  const out: string[] = [];
  const stack = [tip];
  while (stack.length > 0) {
    const id = stack.pop()!;
    out.push(id);
    for (const p of state.commits[id]!.parents) {
      if (!set.has(p)) continue;
      const left = children.get(p)! - 1;
      children.set(p, left);
      if (left === 0) stack.push(p);
    }
  }
  return out.reverse();
}

/** git rebase <upstream> — 지금 브랜치에만 있는 커밋을 upstream 끝에 복사해 다시 쌓는다 */
export const rebase: Handler = (state, args) => {
  const opts = parseOptions(args, {});
  if (isError(opts)) return opts;
  if (opts.positionals.length === 0) {
    return {
      message: 'There is no tracking information for the current branch.',
      hint: '어디 위로 옮길지 적는다 (예: git rebase main)',
    };
  }
  if (opts.positionals.length > 1) return tooManyArgs('rebase');
  const ref = opts.positionals[0]!;
  const upstream = resolve(state, ref);
  if (upstream === null) return { message: `fatal: invalid upstream '${ref}'`, hint: '그런 브랜치 · 커밋이 없다' };

  const head = headCommit(state);
  const name = headBranch(state);
  const updated = `Successfully rebased and updated ${name ? `refs/heads/${name}` : 'detached HEAD'}.`;
  if (isAncestor(state, upstream, head)) return unchanged(state, `Current branch ${name ?? 'HEAD'} is up to date.`);

  const ours = ancestors(state, head);
  const theirs = ancestors(state, upstream);
  const mine = new Set([...ours].filter((id) => !theirs.has(id)));
  // upstream 쪽에 이미 같은 변경(복사본)이 있으면 건너뛴다 — git 의 --cherry-pick
  const applied = new Set([...theirs].filter((id) => !ours.has(id)).map((id) => patchKey(state, id)));
  const todo = replayOrder(state, mine, head).filter(
    (id) => state.commits[id]!.parents.length < 2 && !applied.has(patchKey(state, id)),
  );

  const tx = new Tx(state);
  let base = upstream;
  for (const id of todo) base = tx.addCommit([base], { copyOf: id, message: state.commits[id]!.message });
  tx.moveHead(base);
  return { ...tx.finish(), output: updated };
};
