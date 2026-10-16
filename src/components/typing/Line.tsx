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

/** 오타로 친 글자를 보이게: 공백은 ·, 잘못 누른 Enter 는 ↵ */
const visible = (ch: string) => (ch === ' ' ? '·' : ch === '\n' ? '↵' : ch);

export default function Line({ target, status, typed = '', errorAt = -1, focused = false, prefix }: Props) {
  const mark = prefix && (
    <span aria-hidden="true" className="text-slate-500 select-none">
      {prefix}{' '}
    </span>
  );
  if (status !== 'current') {
    return (
      <div className={`whitespace-pre ${status === 'done' ? 'text-emerald-400/60' : 'text-slate-500'}`}>
        {mark}
        {target || ' '}
      </div>
    );
  }

  const ok = errorAt === -1 ? typed : typed.slice(0, errorAt);
  const wrong = errorAt === -1 ? '' : typed.slice(errorAt);
  const rest = target.slice(typed.length);
  const atEnd = errorAt === -1 && typed.length >= target.length;

  return (
    <div className="whitespace-pre text-slate-200" data-testid="current-line">
      {mark}
      <span className="text-emerald-300">{ok}</span>
      {wrong && (
        <span className="rounded-sm bg-rose-600 text-white" data-testid="typo">
          {[...wrong].map(visible).join('')}
        </span>
      )}
      <Caret blink={focused} />
      <span>{rest}</span>
      {atEnd && <span className="text-slate-500">↵</span>}
    </div>
  );
}
