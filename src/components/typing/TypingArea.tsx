import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
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
  /** 줄 위에 주석처럼 보여 줄 해설 (lines 와 같은 길이). 치지 않는다 */
  comments?: readonly (readonly string[])[];
  /** 줄을 다 치면 아래에 보여 줄 출력 (터미널 화면). 치지 않는다 */
  outputs?: readonly (string | null)[];
  /** 주석 표시 (# 또는 //) */
  commentMark?: string;
  /** 줄 앞 표시 (터미널의 $) */
  prompt?: string;
  /** 출력 줄 앞 표시 (코드 결과 값의 →) */
  outputMark?: string;
  /** 이 줄을 다 치면 그림을 보여 주고 Enter 를 한 번 더 기다린다 */
  pauseAfter?: readonly boolean[];
  /** 그 그림 */
  renderScene?: (lineIndex: number) => ReactNode;
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

const subscribeNothing = () => () => {};
/** 서버에서 그린 HTML 에 React 가 붙었는지. 붙기 전에는 입력을 받을 수 없다 */
const useHydrated = () =>
  useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );

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
  comments,
  outputs,
  commentMark = '//',
  prompt,
  outputMark,
  pauseAfter,
  renderScene,
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
  const hydrated = useHydrated();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const currentLineRef = useRef<HTMLDivElement>(null);
  /** 그림을 보여 주는 중인 줄. 이때는 Enter 만 받는다 */
  const [showing, setShowing] = useState<number | null>(null);
  const showingRef = useRef<number | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  /** 마지막 줄 그림을 다 본 뒤에 알릴 결과 */
  const pendingFinish = useRef<TypingStats | null>(null);

  const commit = (next: TypingState) => {
    stateRef.current = next;
    setState(next);
  };

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus({ preventScroll: true });
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

  useEffect(() => {
    if (showing !== null) sceneRef.current?.scrollIntoView({ block: 'nearest' });
  }, [showing]);

  const setScene = (line: number | null) => {
    showingRef.current = line;
    setShowing(line);
  };

  const send = (input: TypingInput) => {
    // 그림을 보는 중에는 Enter 로 넘어가기만 한다
    if (showingRef.current !== null) {
      if (input.kind !== 'enter') return;
      setScene(null);
      const finish = pendingFinish.current;
      pendingFinish.current = null;
      if (finish) onFinish?.(finish);
      return;
    }

    const now = Date.now();
    const prev = stateRef.current;
    const next = apply(prev, input, now);
    if (next === prev) return;
    setTick(now);
    const finishedNow = prev.finishedAt === null && next.finishedAt !== null;
    const lineDone = finishedNow || next.lineIndex !== prev.lineIndex;

    if (lineDone && pauseAfter?.[prev.lineIndex]) {
      // 그림 보는 시간은 타수 시간에 넣지 않는다
      commit(pause(next));
      setScene(prev.lineIndex);
      if (finishedNow) pendingFinish.current = stats(next, now);
      return;
    }
    commit(next);
    if (finishedNow) onFinish?.(stats(next, now));
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
    inputRef.current?.focus({ preventScroll: true });
  };

  const c = cursor(state);
  const s = stats(state, tick);
  const hint: Hint | null =
    showing !== null
      ? { label: 'Enter', strokes: strokesFor('\n'), note: '그림을 보고 계속' }
      : hintFor(state, keyboardOptions);
  // 마지막 줄 그림을 보는 동안에는 아직 끝난 화면으로 넘기지 않는다
  const finished = state.finishedAt !== null && showing === null;
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
        className={`relative max-h-96 cursor-text overflow-auto rounded-lg border bg-slate-900 p-4 font-mono text-lg leading-relaxed ${
          focused ? 'border-emerald-500/60' : 'border-slate-700'
        }`}
        onClick={() => inputRef.current?.focus({ preventScroll: true })}
        data-testid="typing-area"
      >
        {lines.map((target, i) => {
          const ended = state.finishedAt !== null;
          const current = i === c.lineIndex && !ended;
          const done = i < c.lineIndex || ended;
          const output = outputs?.[i];
          return (
            <div key={i} ref={i === c.lineIndex ? currentLineRef : undefined}>
              {comments?.[i]?.map((text, k) => (
                // 주석은 그 줄과 같은 깊이로 들여 쓴다. 해설이라 한국어가 들어가고, 치지 않는다
                <div
                  key={k}
                  className={`whitespace-pre-wrap ${current ? 'text-sky-300' : 'text-slate-500'}`}
                  style={{ paddingLeft: `${/^ */.exec(target)![0].length}ch` }}
                  data-testid={current ? 'current-comment' : undefined}
                >
                  {commentMark} {text}
                </div>
              ))}
              <Line
                target={target}
                status={done ? 'done' : current ? 'current' : 'pending'}
                typed={state.typed}
                errorAt={c.errorAt}
                focused={focused}
                prefix={prompt}
              />
              {output && done && (
                <pre
                  className={`mb-2 text-sm whitespace-pre ${outputMark ? 'text-emerald-300/80' : 'text-slate-400'}`}
                  data-testid="output"
                >
                  {outputMark
                    ? output
                        .split('\n')
                        .map((l) => `${outputMark} ${l}`)
                        .join('\n')
                    : output}
                </pre>
              )}
              {showing === i && renderScene && <div ref={sceneRef}>{renderScene(i)}</div>}
            </div>
          );
        })}
        {!focused && !finished && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-sm text-slate-300">
            {!hydrated ? '불러오는 중…' : `여기를 눌러 ${state.startedAt === null ? '시작' : '계속'}`}
          </div>
        )}
      </div>
      {/* 숨긴 입력 칸은 스크롤 영역 밖에 둔다. 안에 두면 포커스할 때 영역이 그 칸(맨 끝)으로 스크롤된다 */}
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
