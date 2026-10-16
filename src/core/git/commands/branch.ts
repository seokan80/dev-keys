import { headBranch, headCommit, isAncestor, labelOf } from '../graph';
import { isError, parseOptions } from '../parse';
import { resolve } from '../refs';
import { Tx } from '../state';
import type { GitError, RepoState } from '../types';
import {
  branchExists,
  invalidBranchName,
  tooManyArgs,
  unchanged,
  validBranchName,
  type Handler,
  type Outcome,
} from './common';

function list(state: RepoState): Outcome {
  const current = headBranch(state);
  const lines = Object.keys(state.branches)
    .sort()
    .map((name) => `${name === current ? '*' : ' '} ${name}`);
  if (state.head.type === 'detached') lines.unshift(`* (HEAD detached at ${labelOf(state, state.head.commit)})`);
  return unchanged(state, lines.join('\n'));
}

function remove(state: RepoState, names: string[], force: boolean): Outcome | GitError {
  if (names.length === 0) return { message: 'fatal: branch name required', hint: '지울 브랜치 이름을 적는다' };
  const tx = new Tx(state);
  const lines: string[] = [];
  for (const name of names) {
    const tip = tx.state.branches[name];
    if (tip === undefined) return { message: `error: branch '${name}' not found`, hint: '그런 이름의 브랜치가 없다' };
    if (headBranch(state) === name) {
      return {
        message: `error: cannot delete branch '${name}' used by worktree at '~/devkeys'`,
        hint: '지금 있는 브랜치는 지울 수 없다 — 다른 브랜치로 옮긴 뒤 지운다',
      };
    }
    if (!force && !isAncestor(state, tip, headCommit(state))) {
      return {
        message: `error: the branch '${name}' is not fully merged`,
        hint: `합쳐지지 않은 커밋이 있다 — 정말 지우려면 git branch -D ${name}`,
      };
    }
    tx.setBranch(name, null);
    lines.push(`Deleted branch ${name} (was ${labelOf(state, tip)}).`);
  }
  return { ...tx.finish(), output: lines.join('\n') };
}

function rename(state: RepoState, names: string[]): Outcome | GitError {
  if (names.length === 0 || names.length > 2) return tooManyArgs('branch -m');
  const current = headBranch(state);
  const [from, to] = names.length === 2 ? names : [current, names[0]!];
  if (from === null || from === undefined) {
    return {
      message: 'fatal: cannot rename the current branch while not on any',
      hint: 'detached HEAD 에서는 바꿀 이름이 없다',
    };
  }
  if (state.branches[from] === undefined) {
    return { message: `error: refname refs/heads/${from} not found`, hint: '그런 이름의 브랜치가 없다' };
  }
  if (!validBranchName(to!)) return invalidBranchName(to!);
  if (state.branches[to] !== undefined) return branchExists(to);
  const tx = new Tx(state);
  tx.renameBranch(from, to);
  return { ...tx.finish(), output: '' };
}

function create(state: RepoState, names: string[]): Outcome | GitError {
  if (names.length > 2) return tooManyArgs('branch');
  const [name, start = 'HEAD'] = names as [string, string?];
  if (!validBranchName(name)) return invalidBranchName(name);
  if (state.branches[name] !== undefined) return branchExists(name);
  const at = resolve(state, start);
  if (at === null) return { message: `fatal: not a valid object name: '${start}'`, hint: '그런 브랜치 · 커밋이 없다' };
  const tx = new Tx(state);
  tx.setBranch(name, at);
  return { ...tx.finish(), output: '' };
}

/** git branch [<name> [<start>]] · -d / -D <name>… · -m [<old>] <new> */
export const branch: Handler = (state, args) => {
  const opts = parseOptions(args, { flags: ['-d', '-D', '--delete', '-m', '--move', '--list'] });
  if (isError(opts)) return opts;
  const { flags, positionals } = opts;
  if (flags.has('-d') || flags.has('-D') || flags.has('--delete')) return remove(state, positionals, flags.has('-D'));
  if (flags.has('-m') || flags.has('--move')) return rename(state, positionals);
  if (positionals.length === 0 || flags.has('--list')) return list(state);
  return create(state, positionals);
};
