import { useEffect, useRef, useState } from 'react';
import { describeStrokes, keyStroke, strokesFor, type KeyboardOptions, type Strokes } from '@core/keyboard';
import {
  apply,
  createSession,
  cursor,
  pause,
  stats,
  type TypingInput,
  type TypingOptions,
  type TypingState,
  type TypingStats,
} from '@core/typing';
import FingerKeyboard from '../keyboard/FingerKeyboard';
import FingerLegend from '../keyboard/FingerLegend';
import Line from './Line';

type Props = {
  lines: readonly string[];
  typingOptions?: Partial<TypingOptions>;
  keyboardOptions?: KeyboardOptions;
  showKeyboard?: boolean;
  autoFocus?: boolean;
  onFinish?: (stats: TypingStats) => void;
};

const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힣]/;

const formatTime = (ms: number) => {
  const sec = Math.floor(ms / 1000);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
};

type Hint = { label: string; strokes: Strokes | null; note?: string };

function hintFor(state: TypingState, keyboardOptions: KeyboardOptions): Hint | null {
  const expected = cursor(state).expected;
  if (!expected) return null;
  if (expected.kind === 'backspace') {
    return { label: 'Backspace', strokes: keyStroke('Backspace'), note: '틀린 글자를 지우세요' };
  }
  if (expected.kind === 'enter') return { label: 'Enter', strokes: strokesFor('\n') };
  const ch = expected.char;
  return { label: ch === ' ' ? 'Space' : ch, strokes: strokesFor(ch, keyboardOptions) };
}

/** 따라치기 영역: 줄 표시 + 숨긴 입력 칸 + 다음 키 안내 + 손가락 키보드 */
export default function TypingArea({
  lines,
  typingOptions,
  keyboardOptions = {},
  showKeyboard = true,
  autoFocus = false,
  onFinish,
}: Props) {
  const [state, setState] = useState(() => createSession(lines, typingOptions));
  const stateRef = useRef(state);
  const [tick, setTick] = useState(0);
  const [focused, setFocused] = useState(false);
  const [ime, setIme] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const currentLineRef = useRef<HTMLDivElement>(null);

  const commit = (next: TypingState) => {
    stateRef.current = next;
    setState(next);
  };

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // 진행 중에는 경과 시간·타수를 0.5초마다 갱신
  const running = state.startedAt !== null && state.finishedAt === null && focused;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick(Date.now()), 500);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    currentLineRef.current?.scrollIntoView({ block: 'nearest' });
  }, [state.lineIndex]);

  const send = (input: TypingInput) => {
    const now = Date.now();
    const prev = stateRef.current;
    const next = apply(prev, input, now);
    if (next === prev) return;
    commit(next);
    setTick(now);
    if (prev.finishedAt === null && next.finishedAt !== null) onFinish?.(stats(next, now));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing || e.key === 'Process') {
      setIme(true);
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === 'Backspace') send({ kind: 'backspace' });
    else if (e.key === 'Enter') send({ kind: 'enter' });
    else if (e.key === 'Tab') {
      // 들여쓰기는 스페이스로 친다. Tab 으로 포커스가 빠져나가지 않게만 막는다.
    } else if (e.key.length === 1) {
      if (HANGUL.test(e.key)) setIme(true);
      else {
        setIme(false);
        send({ kind: 'char', char: e.key });
      }
    } else return;
    e.preventDefault();
  };

  const restart = () => {
    commit(createSession(lines, typingOptions));
    setTick(0);
    inputRef.current?.focus();
  };

  const c = cursor(state);
  const s = stats(state, tick);
  const hint = hintFor(state, keyboardOptions);
  const finished = state.finishedAt !== null;
  const activeFingers = hint?.strokes
    ? [hint.strokes.finger, ...(hint.strokes.shift ? [hint.strokes.shift.finger] : [])]
    : [];

  return (
    <section className="flex flex-col gap-4">
      <dl className="flex gap-6 text-sm text-slate-400" data-testid="stats">
        <div>
          <dt className="inline">타수 </dt>
          <dd className="inline font-mono text-slate-100">{Math.round(s.cpm)}</dd>
        </div>
        <div>
          <dt className="inline">정확도 </dt>
          <dd className="inline font-mono text-slate-100">
            {s.accuracy === null ? '—' : `${Math.round(s.accuracy * 100)}%`}
          </dd>
        </div>
        <div>
          <dt className="inline">시간 </dt>
          <dd className="inline font-mono text-slate-100">{formatTime(s.elapsedMs)}</dd>
        </div>
      </dl>
      <div className="h-1 overflow-hidden rounded bg-slate-800" aria-hidden="true">
        <div className="h-full bg-emerald-400 transition-all" style={{ width: `${s.progress * 100}%` }} />
      </div>

      {ime && (
        <p
          role="alert"
          className="rounded-md bg-amber-500/15 px-3 py-2 text-sm text-amber-200"
          data-testid="ime-notice"
        >
          한글 입력 상태예요. <kbd className="font-mono">한/영</kbd> 키를 눌러 영문으로 바꿔 주세요.
        </p>
      )}

      <div
        className={`relative max-h-80 cursor-text overflow-auto rounded-lg border bg-slate-900 p-4 font-mono text-lg leading-relaxed ${
          focused ? 'border-emerald-500/60' : 'border-slate-700'
        }`}
        onClick={() => inputRef.current?.focus()}
        data-testid="typing-area"
      >
        {lines.map((target, i) => (
          <div key={i} ref={i === c.lineIndex ? currentLineRef : undefined}>
            <Line
              target={target}
              status={
                i < c.lineIndex || (finished && i === c.lineIndex) ? 'done' : i === c.lineIndex ? 'current' : 'pending'
              }
              typed={state.typed}
              errorAt={c.errorAt}
              focused={focused}
            />
          </div>
        ))}
        {!focused && !finished && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-sm text-slate-300">
            여기를 눌러 {state.startedAt === null ? '시작' : '계속'}
          </div>
        )}
        <textarea
          ref={inputRef}
          aria-label="따라치기 입력"
          className="sr-only"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onKeyDown={onKeyDown}
          onCompositionStart={() => setIme(true)}
          onCompositionEnd={(e) => (e.currentTarget.value = '')}
          onInput={(e) => (e.currentTarget.value = '')}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            commit(pause(stateRef.current));
          }}
        />
      </div>

      {finished ? (
        <div className="flex items-center gap-4 rounded-lg bg-emerald-500/10 p-4" data-testid="finished">
          <p className="text-emerald-300">
            완료 — 타수 {Math.round(s.cpm)}, 정확도 {s.accuracy === null ? '—' : `${Math.round(s.accuracy * 100)}%`}
          </p>
          <button type="button" className="rounded-md bg-slate-700 px-3 py-1 text-sm" onClick={restart}>
            다시 하기
          </button>
        </div>
      ) : (
        hint && (
          <p className="text-center text-sm text-slate-300" data-testid="next-key">
            다음 키 <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-100">{hint.label}</kbd> —{' '}
            {hint.strokes ? describeStrokes(hint.strokes) : '키보드로 칠 수 없는 글자'}
            {hint.note && <span className="text-rose-300"> ({hint.note})</span>}
          </p>
        )
      )}

      {showKeyboard && !finished && (
        <div className="flex flex-col gap-2">
          <FingerKeyboard highlight={hint?.strokes ?? null} options={keyboardOptions} />
          <FingerLegend active={activeFingers} />
        </div>
      )}
    </section>
  );
}
