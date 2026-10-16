import { headBranch, labelOf } from '../graph';
import { isError, parseOptions } from '../parse';
import { Tx } from '../state';
import type { Handler } from './common';

/** git commit [-m <msg>] [-a] [--allow-empty] — 스테이징이 없으니 -a 등은 받아만 둔다 */
export const commit: Handler = (state, args) => {
  const opts = parseOptions(args, { flags: ['-a', '--all', '--allow-empty'], values: ['-m', '--message'] });
  if (isError(opts)) return opts;
  if (opts.positionals.length > 0) {
    return {
      message: `error: pathspec '${opts.positionals[0]}' did not match any file(s) known to git`,
      hint: '이 연습은 파일을 다루지 않는다 — git commit -m "메시지" 처럼 친다',
    };
  }
  const message = opts.values.get('-m') ?? opts.values.get('--message');
  const tx = new Tx(state);
  const id = tx.addCommit([tx.headCommit()], { message });
  tx.moveHead(id);
  const done = tx.finish();
  return { ...done, output: `[${headBranch(state) ?? 'detached HEAD'} ${labelOf(done.state, id)}] ${message ?? ''}` };
};
