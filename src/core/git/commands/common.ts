import type { GitError, GitEvent, RepoState, ResetMode } from '../types';

/** 명령 하나의 결과 (오류가 아닐 때) */
export type Outcome = { state: RepoState; events: GitEvent[]; output: string; resetMode?: ResetMode };
export type Handler = (state: RepoState, args: readonly string[]) => Outcome | GitError;

export const unchanged = (state: RepoState, output: string): Outcome => ({ state, events: [], output });

/** git check-ref-format 의 주요 규칙 */
export function validBranchName(name: string): boolean {
  if (name === '' || name === 'HEAD' || name === '@') return false;
  if (/^[-/]|[/.]$|\.lock$|\.\.|\/\/|@\{|[\s~^:?*[\\]/.test(name)) return false;
  return !name.split('/').some((part) => part.startsWith('.'));
}

export const invalidBranchName = (name: string): GitError => ({
  message: `fatal: '${name}' is not a valid branch name`,
  hint: '브랜치 이름에는 공백 · .. · ~ ^ : ? * [ 를 쓸 수 없다',
});

export const branchExists = (name: string): GitError => ({
  message: `fatal: a branch named '${name}' already exists`,
  hint: '같은 이름의 브랜치가 이미 있다',
});

export const tooManyArgs = (command: string): GitError => ({
  message: `fatal: too many arguments for ${command}`,
  hint: '인자가 너무 많다',
});
