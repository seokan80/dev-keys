import Caret from './Caret';

type Props = {
  target: string;
  status: 'done' | 'current' | 'pending';
  /** 현재 줄에서 입력된 것 */
  typed?: string;
  /** 첫 오타 위치, 없으면 -1 */
  errorAt?: number;
  /** 커서를 깜박일지 (입력 칸에 포커스가 있을 때) */
  focused?: boolean;
  /** 줄 앞에 붙는 표시 (터미널의 $). 치지 않는다 */
  prefix?: string;
};

/** 긴 줄은 옆으로 밀리지 않게 다음 줄로 잇는다 — 공백에서 먼저 끊고, 안 되면 아무 데서나. 들여쓰기는 그대로 */
const WRAP = 'min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]';

/** 오타로 친 글자를 보이게: 공백은 ·, 잘못 누른 Enter 는 ↵ */
const visible = (ch: string) => (ch === ' ' ? '·' : ch === '\n' ? '↵' : ch);

export default function Line({ target, status, typed = '', errorAt = -1, focused = false, prefix }: Props) {
  // 줄 앞 표시($ · 질문)는 왼쪽에 두고, 이어지는 줄은 표시 뒤에 맞춰 들여 쓴다
  const mark = prefix && (
    <span aria-hidden="true" className="shrink-0 whitespace-pre text-slate-400 select-none">
      {prefix}{' '}
    </span>
  );
  if (status !== 'current') {
    return (
      <div className={`flex ${status === 'done' ? 'text-emerald-400/60' : 'text-slate-400'}`}>
        {mark}
        <span className={WRAP}>{target || ' '}</span>
      </div>
    );
  }

  const ok = errorAt === -1 ? typed : typed.slice(0, errorAt);
  const wrong = errorAt === -1 ? '' : typed.slice(errorAt);
  const rest = target.slice(typed.length);
  const atEnd = errorAt === -1 && typed.length >= target.length;

  return (
    <div className="flex text-slate-200" data-testid="current-line">
      {mark}
      <span className={WRAP}>
        <span className="text-emerald-300">{ok}</span>
        {wrong && (
          <span className="rounded-sm bg-rose-600 text-white" data-testid="typo">
            {[...wrong].map(visible).join('')}
          </span>
        )}
        <Caret blink={focused} />
        <span>{rest}</span>
        {atEnd && <span className="text-slate-400">↵</span>}
      </span>
    </div>
  );
}
