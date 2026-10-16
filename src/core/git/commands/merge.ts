import { headBranch, headCommit, isAncestor, labelOf } from '../graph';
import { isError, parseOptions } from '../parse';
import { resolve } from '../refs';
import { Tx } from '../state';
import { tooManyArgs, unchanged, type Handler } from './common';

/** git merge [--no-ff | --ff-only] [-m <msg>] <ref> — 충돌은 다루지 않는다 (파일이 없다) */
export const merge: Handler = (state, args) => {
  const opts = parseOptions(args, {
    flags: ['--no-ff', '--ff-only', '--ff', '--no-edit', '--edit'],
    values: ['-m', '--message'],
  });
  if (isError(opts)) return opts;
  if (opts.positionals.length === 0)
    return { message: 'fatal: No remote for the current branch.', hint: '합칠 브랜치 이름을 적는다' };
  if (opts.positionals.length > 1) return tooManyArgs('merge');
  const ref = opts.positionals[0]!;
  const theirs = resolve(state, ref);
  if (theirs === null)
    return { message: `merge: ${ref} - not something we can merge`, hint: '그런 브랜치 · 커밋이 없다' };

  const ours = headCommit(state);
  if (isAncestor(state, theirs, ours)) return unchanged(state, 'Already up to date.');

  const canFastForward = isAncestor(state, ours, theirs);
  if (opts.flags.has('--ff-only') && !canFastForward) {
    return {
      message: 'fatal: Not possible to fast-forward, aborting.',
      hint: '갈라져 있어서 fast-forward 로는 합칠 수 없다',
    };
  }

  const tx = new Tx(state);
  if (canFastForward && !opts.flags.has('--no-ff')) {
    tx.moveHead(theirs);
    return { ...tx.finish(), output: `Updating ${labelOf(state, ours)}..${labelOf(state, theirs)}\nFast-forward` };
  }

  const current = headBranch(state);
  const message =
    opts.values.get('-m') ??
    opts.values.get('--message') ??
    (state.branches[ref] !== undefined
      ? `Merge branch '${ref}'${current && current !== 'main' && current !== 'master' ? ` into ${current}` : ''}`
      : `Merge commit '${ref}'`);
  const id = tx.addCommit([ours, theirs], { message });
  tx.moveHead(id);
  return { ...tx.finish(), output: "Merge made by the 'ort' strategy." };
};
