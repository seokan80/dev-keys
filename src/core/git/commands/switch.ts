import { headCommit, labelOf } from '../graph';
import { isError, parseOptions } from '../parse';
import { resolve } from '../refs';
import { Tx } from '../state';
import type { GitError, Head, RepoState } from '../types';
import { branchExists, invalidBranchName, tooManyArgs, validBranchName, type Handler, type Outcome } from './common';

const sameHead = (a: Head, b: Head) => JSON.stringify(a) === JSON.stringify(b);

function attach(state: RepoState, name: string): Outcome {
  const tx = new Tx(state);
  const to: Head = { type: 'branch', name };
  const already = sameHead(state.head, to);
  tx.setHead(to);
  return { ...tx.finish(), output: already ? `Already on '${name}'` : `Switched to branch '${name}'` };
}

function detach(state: RepoState, id: string): Outcome {
  const tx = new Tx(state);
  tx.setHead({ type: 'detached', commit: id });
  const c = state.commits[id]!;
  return { ...tx.finish(), output: `HEAD is now at ${c.label} ${c.message ?? ''}` };
}

function createAndAttach(state: RepoState, name: string, start: string | undefined): Outcome | GitError {
  if (!validBranchName(name)) return invalidBranchName(name);
  if (state.branches[name] !== undefined) return branchExists(name);
  const at = start === undefined ? headCommit(state) : resolve(state, start);
  if (at === null) return { message: `fatal: invalid reference: ${start}`, hint: '그런 브랜치 · 커밋이 없다' };
  const tx = new Tx(state);
  tx.setBranch(name, at);
  tx.setHead({ type: 'branch', name });
  return { ...tx.finish(), output: `Switched to a new branch '${name}'` };
}

/** "-" = 바로 전 HEAD */
function previousTarget(state: RepoState): string | null {
  if (!state.previous) return null;
  return state.previous.type === 'branch' ? state.previous.name : labelOf(state, state.previous.commit);
}

/** git switch <branch> · -c <new> [<start>] · --detach [<commit>] · - */
export const switchCommand: Handler = (state, args) => {
  const opts = parseOptions(args, { flags: ['--detach', '-d'], values: ['-c', '--create'] });
  if (isError(opts)) return opts;
  const create = opts.values.get('-c') ?? opts.values.get('--create');
  const { positionals } = opts;

  if (create !== undefined) {
    if (positionals.length > 1) return tooManyArgs('switch');
    return createAndAttach(state, create, positionals[0]);
  }
  if (positionals.length > 1) return tooManyArgs('switch');

  let target = positionals[0];
  if (target === '-') {
    const prev = previousTarget(state);
    if (prev === null) return { message: 'fatal: invalid reference: @{-1}', hint: '바로 전에 있던 브랜치가 없다' };
    target = prev;
  }

  if (opts.flags.has('--detach') || opts.flags.has('-d')) {
    const id = resolve(state, target ?? 'HEAD');
    if (id === null) return { message: `fatal: invalid reference: ${target}`, hint: '그런 브랜치 · 커밋이 없다' };
    return detach(state, id);
  }
  if (target === undefined)
    return { message: 'fatal: missing branch or commit argument', hint: '옮겨 갈 브랜치 이름을 적는다' };
  if (state.branches[target] !== undefined) return attach(state, target);

  const id = resolve(state, target);
  if (id !== null) {
    return {
      message: `fatal: a branch is expected, got commit '${target}'`,
      hint: `switch 는 브랜치로만 옮긴다 — 커밋으로 가려면 git switch --detach ${target}`,
    };
  }
  return { message: `fatal: invalid reference: ${target}`, hint: '그런 이름의 브랜치가 없다' };
};

/** git checkout <branch | commit> · -b <new> [<start>] · - (옛 방식: switch 와 restore 가 하던 일을 함께 한다) */
export const checkout: Handler = (state, args) => {
  const opts = parseOptions(args, { flags: ['--detach'], values: ['-b'] });
  if (isError(opts)) return opts;
  const create = opts.values.get('-b');
  const { positionals } = opts;
  if (create !== undefined) {
    if (positionals.length > 1) return tooManyArgs('checkout');
    return createAndAttach(state, create, positionals[0]);
  }
  if (positionals.length > 1) return tooManyArgs('checkout');

  let target = positionals[0];
  if (target === undefined)
    return { message: 'fatal: you must specify a branch', hint: '옮겨 갈 브랜치나 커밋을 적는다' };
  if (target === '-') {
    const prev = previousTarget(state);
    if (prev === null)
      return {
        message: "error: pathspec '-' did not match any file(s) known to git",
        hint: '바로 전에 있던 브랜치가 없다',
      };
    target = prev;
  }
  if (!opts.flags.has('--detach') && state.branches[target] !== undefined) return attach(state, target);
  const id = resolve(state, target);
  if (id === null) {
    return {
      message: `error: pathspec '${target}' did not match any file(s) known to git`,
      hint: '그런 브랜치 · 커밋이 없다 (checkout 은 파일 이름으로도 읽는다)',
    };
  }
  return detach(state, id);
};
