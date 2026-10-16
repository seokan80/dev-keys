import { isError, parseOptions } from '../parse';
import { resolve } from '../refs';
import { Tx } from '../state';
import type { ResetMode } from '../types';
import { tooManyArgs, type Handler } from './common';

/**
 * git reset [--soft | --mixed | --hard] [<commit>] — 지금 브랜치(또는 HEAD)를 옮긴다.
 * 스테이징 · 작업 트리가 없어 세 모드의 결과 상태는 같고, 모드는 정보로만 남긴다 (구현계획 2.2 #8)
 */
export const reset: Handler = (state, args) => {
  const opts = parseOptions(args, { flags: ['--soft', '--mixed', '--hard'] });
  if (isError(opts)) return opts;
  const modes = (['soft', 'mixed', 'hard'] as const).filter((m) => opts.flags.has(`--${m}`));
  if (modes.length > 1)
    return { message: 'fatal: --soft, --mixed and --hard are mutually exclusive', hint: '모드는 하나만' };
  const mode: ResetMode = modes[0] ?? 'mixed';
  if (opts.positionals.length > 1) return tooManyArgs('reset');
  const ref = opts.positionals[0] ?? 'HEAD';
  const to = resolve(state, ref);
  if (to === null) {
    return {
      message: `fatal: ambiguous argument '${ref}': unknown revision or path not in the working tree.`,
      hint: '그런 브랜치 · 커밋이 없다 (HEAD~n 이 첫 커밋보다 앞이면 이 오류)',
    };
  }
  const tx = new Tx(state);
  tx.moveHead(to);
  const c = state.commits[to]!;
  return {
    ...tx.finish(),
    output: mode === 'hard' ? `HEAD is now at ${c.label} ${c.message ?? ''}` : '',
    resetMode: mode,
  };
};
