import { branch } from './commands/branch';
import { commit } from './commands/commit';
import type { Handler } from './commands/common';
import { merge } from './commands/merge';
import { cherryPick, revert } from './commands/pick';
import { rebase } from './commands/rebase';
import { reset } from './commands/reset';
import { checkout, switchCommand } from './commands/switch';
import { isError, parseCommand } from './parse';
import type { ExecResult, GitError, RepoState } from './types';

const HANDLERS: Record<string, Handler> = {
  commit,
  branch,
  switch: switchCommand,
  checkout,
  merge,
  rebase,
  'cherry-pick': cherryPick,
  reset,
  revert,
};

export const SUPPORTED_COMMANDS = Object.keys(HANDLERS);

const REMOTE = new Set(['push', 'pull', 'fetch', 'clone', 'remote']);
const OUT_OF_SCOPE = new Set([
  'add',
  'status',
  'diff',
  'log',
  'show',
  'restore',
  'stash',
  'init',
  'config',
  'rm',
  'mv',
  'tag',
  'reflog',
  'blame',
  'clean',
  'bisect',
]);

function unsupported(name: string): GitError {
  if (REMOTE.has(name)) {
    return {
      message: `git ${name}: 이 연습에서는 쓰지 않는 명령`,
      hint: '원격 저장소(push · pull)는 다루지 않는다 — 내 저장소의 커밋 트리만 연습한다',
    };
  }
  if (OUT_OF_SCOPE.has(name)) {
    return {
      message: `git ${name}: 이 연습에서는 쓰지 않는 명령`,
      hint: '파일 · 스테이징 · 기록 보기는 다루지 않는다 — 커밋 트리 그림을 보면 된다',
    };
  }
  return {
    message: `git: '${name}' is not a git command. See 'git --help'.`,
    hint: `명령 이름을 확인하세요 — 쓸 수 있는 명령: ${SUPPORTED_COMMANDS.join(' · ')}`,
  };
}

/** 명령 한 줄을 실행한다. 오류면 상태는 그대로이고 사건은 없다 */
export function execute(state: RepoState, input: string): ExecResult {
  const parsed = parseCommand(input);
  const fail = (error: GitError, command = ''): ExecResult => ({
    state,
    events: [],
    output: '',
    error,
    info: { command },
  });
  if (isError(parsed)) return fail(parsed);

  const handler = HANDLERS[parsed.name];
  if (!handler) return fail(unsupported(parsed.name), parsed.name);

  const outcome = handler(state, parsed.args);
  if (isError(outcome)) return fail(outcome, parsed.name);
  return {
    state: outcome.state,
    events: outcome.events,
    output: outcome.output,
    error: null,
    info: { command: parsed.name, ...(outcome.resetMode ? { resetMode: outcome.resetMode } : {}) },
  };
}
