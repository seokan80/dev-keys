import { ancestors, headBranch, labelOf, patchKey } from '../graph';
import { isError, parseOptions } from '../parse';
import { resolve } from '../refs';
import { Tx } from '../state';
import type { GitError, RepoState } from '../types';
import type { Handler } from './common';

const isMerge = (state: RepoState, id: string): GitError | null =>
  state.commits[id]!.parents.length > 1
    ? {
        message: `error: commit ${labelOf(state, id)} is a merge but no -m option was given.`,
        hint: '머지 커밋은 어느 쪽 부모 기준인지 정해야 해서 이 연습에서는 다루지 않는다',
      }
    : null;

/** 지금 HEAD 까지의 기록에 있는 변경들 (patch 열쇠) */
const changesHere = (tx: Tx) => new Set([...ancestors(tx.state, tx.headCommit())].map((a) => patchKey(tx.state, a)));

/**
 * 되돌릴 변경이 지금 기록에 살아 있는가. 실제 git 은 없는 변경을 되돌리려 하면 충돌로 멈춘다.
 * (파일이 없는 이 엔진에서는 "그 커밋(또는 복사본)이 기록에 있고, 아직 되돌리지 않았다"로 본다)
 */
function revertable(tx: Tx, id: string): GitError | null {
  const here = changesHere(tx);
  const key = patchKey(tx.state, id);
  const c = tx.state.commits[id]!;
  if (!here.has(key) || here.has(`revert:${key}`)) {
    return {
      message: `error: could not revert ${c.label}... ${c.message ?? ''}`,
      hint: here.has(`revert:${key}`)
        ? '이미 되돌린 커밋이다'
        : '지금 브랜치에 없는 커밋은 되돌릴 수 없다 — 되돌릴 변경이 없다',
    };
  }
  return null;
}

/** cherry-pick 과 revert 의 공통: 커밋을 하나씩 지금 위에 쌓는다. 하나라도 실패하면 아무것도 바꾸지 않는다 */
function applyEach(
  state: RepoState,
  args: readonly string[],
  command: string,
  make: (tx: Tx, id: string) => string | GitError,
) {
  const opts = parseOptions(args, {});
  if (isError(opts)) return opts;
  if (opts.positionals.length === 0)
    return { message: `fatal: empty commit set passed`, hint: `${command} 할 커밋을 적는다` };
  const tx = new Tx(state);
  const lines: string[] = [];
  for (const ref of opts.positionals) {
    const id = resolve(tx.state, ref);
    if (id === null) return { message: `fatal: bad revision '${ref}'`, hint: '그런 브랜치 · 커밋이 없다' };
    const merge = isMerge(tx.state, id);
    if (merge) return merge;
    const made = make(tx, id);
    if (isError(made)) return made;
    tx.moveHead(made);
    const c = tx.state.commits[made]!;
    lines.push(`[${headBranch(state) ?? 'detached HEAD'} ${c.label}] ${c.message ?? ''}`);
  }
  return { ...tx.finish(), output: lines.join('\n') };
}

/** git cherry-pick <commit>… — 커밋을 복사해 지금 위에 쌓는다 */
export const cherryPick: Handler = (state, args) =>
  applyEach(state, args, 'cherry-pick', (tx, id) => {
    if (changesHere(tx).has(patchKey(tx.state, id))) {
      return {
        message: 'The previous cherry-pick is now empty, possibly due to conflict resolution.',
        hint: '이미 지금 브랜치에 있는 변경이다 — 복사할 것이 없다',
      };
    }
    // 되돌림 커밋을 복사하는 것은 그 되돌림을 다시 적용하는 것 — 원본 변경이 여기 있어야 한다
    const origin = tx.state.commits[id]!.origin;
    if (origin?.kind === 'revert') {
      const blocked = revertable(tx, origin.of);
      if (blocked) {
        return {
          message: `error: could not apply ${tx.state.commits[id]!.label}... ${tx.state.commits[id]!.message ?? ''}`,
          hint: blocked.hint,
        };
      }
    }
    return tx.addCommit([tx.headCommit()], { copyOf: id, message: tx.state.commits[id]!.message });
  });

/** git revert <commit>… — 그 커밋을 되돌리는 새 커밋을 쌓는다 (기록은 지우지 않는다) */
export const revert: Handler = (state, args) =>
  applyEach(state, args, 'revert', (tx, id) => {
    const blocked = revertable(tx, id);
    if (blocked) return blocked;
    const c = tx.state.commits[id]!;
    return tx.addCommit([tx.headCommit()], { revertOf: id, message: `Revert "${c.message ?? c.label}"` });
  });
