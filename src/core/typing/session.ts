export type TypingOptions = {
  /** 줄 앞 공백을 미리 채운다 (타수·정확도에서 뺀다) */
  autoIndent: boolean;
  /** 틀린 글자 뒤로 더 받을 글자 수. 넘으면 입력을 무시하되 오타로 센다 (구현계획 1.2 #2) */
  maxErrorTail: number;
  /** 이보다 긴 무입력 구간은 경과 시간에서 뺀다 (ms) */
  idleMs: number;
};

export const DEFAULT_TYPING_OPTIONS: TypingOptions = { autoIndent: true, maxErrorTail: 5, idleMs: 10_000 };

export type TypingInput = { kind: 'char'; char: string } | { kind: 'backspace' } | { kind: 'enter' };

export type TypingState = Readonly<{
  lines: readonly string[];
  options: TypingOptions;
  lineIndex: number;
  /** 지금 줄에 입력된 것 (미리 채운 들여쓰기·오타 포함, 잘못 누른 Enter 는 '\n') */
  typed: string;
  /** 백스페이스로 지울 수 없는 앞부분 길이 (미리 채운 들여쓰기) */
  locked: number;
  correct: number;
  incorrect: number;
  startedAt: number | null;
  /** 마지막 입력 시각. null 이면 멈춤(시작 전 또는 pause) — 다음 입력까지의 구간을 세지 않는다 */
  lastInputAt: number | null;
  activeMs: number;
  finishedAt: number | null;
}>;

export type Expected = { kind: 'char'; char: string } | { kind: 'enter' } | { kind: 'backspace' };

export type Cursor = {
  lineIndex: number;
  column: number;
  /** 첫 오타 위치, 없으면 -1 */
  errorAt: number;
  /** 다음에 칠 것. 끝났으면 null */
  expected: Expected | null;
};

export type TypingStats = {
  elapsedMs: number;
  /** 분당 타수 = 맞게 친 글자(Enter 포함) ÷ 경과 분 */
  cpm: number;
  /** 맞게 친 수 ÷ 전체 입력 수 (백스페이스 제외). 입력 전에는 null */
  accuracy: number | null;
  correct: number;
  incorrect: number;
  /** 0 ~ 1 */
  progress: number;
};

const indentOf = (line: string) => /^ */.exec(line)![0];

/** typed 가 target 과 처음 어긋나는 위치. 없으면 -1 */
function firstError(typed: string, target: string): number {
  for (let i = 0; i < typed.length; i++) {
    if (i >= target.length || typed[i] !== target[i]) return i;
  }
  return -1;
}

export function createSession(lines: readonly string[], options: Partial<TypingOptions> = {}): TypingState {
  if (lines.length === 0) throw new Error('따라칠 줄이 없다');
  const opts = { ...DEFAULT_TYPING_OPTIONS, ...options };
  const typed = opts.autoIndent ? indentOf(lines[0]!) : '';
  return {
    lines,
    options: opts,
    lineIndex: 0,
    typed,
    locked: typed.length,
    correct: 0,
    incorrect: 0,
    startedAt: null,
    lastInputAt: null,
    activeMs: 0,
    finishedAt: null,
  };
}

/** 입력 하나를 반영한 새 상태. 끝났거나 받을 수 없는 입력이면 같은 상태를 돌려준다. */
export function apply(state: TypingState, input: TypingInput, now: number): TypingState {
  if (state.finishedAt !== null) return state;
  if (input.kind === 'char' && [...input.char].length !== 1) return state;

  const { idleMs, maxErrorTail, autoIndent } = state.options;
  const gap = state.lastInputAt === null ? 0 : now - state.lastInputAt;
  let s: TypingState = {
    ...state,
    startedAt: state.startedAt ?? now,
    lastInputAt: now,
    activeMs: state.activeMs + (gap > 0 && gap <= idleMs ? gap : 0),
  };

  const target = s.lines[s.lineIndex]!;
  const errorAt = firstError(s.typed, target);

  const appendWrong = (ch: string): TypingState => {
    const tail = errorAt === -1 ? 0 : s.typed.length - errorAt;
    const accepted = tail < 1 + maxErrorTail;
    return { ...s, incorrect: s.incorrect + 1, typed: accepted ? s.typed + ch : s.typed };
  };

  switch (input.kind) {
    case 'backspace':
      return s.typed.length > s.locked ? { ...s, typed: s.typed.slice(0, -1) } : s;

    case 'enter': {
      if (errorAt !== -1 || s.typed.length < target.length) return appendWrong('\n');
      s = { ...s, correct: s.correct + 1 };
      if (s.lineIndex === s.lines.length - 1) return { ...s, finishedAt: now };
      const next = s.lines[s.lineIndex + 1]!;
      const typed = autoIndent ? indentOf(next) : '';
      return { ...s, lineIndex: s.lineIndex + 1, typed, locked: typed.length };
    }

    case 'char': {
      const ch = input.char;
      if (errorAt === -1 && target[s.typed.length] === ch) {
        return { ...s, typed: s.typed + ch, correct: s.correct + 1 };
      }
      return appendWrong(ch);
    }
  }
}

/** 탭 이탈 등: 다음 입력까지의 구간을 경과 시간에 넣지 않는다 */
export function pause(state: TypingState): TypingState {
  return state.finishedAt !== null || state.lastInputAt === null ? state : { ...state, lastInputAt: null };
}

export function cursor(state: TypingState): Cursor {
  const target = state.lines[state.lineIndex]!;
  const errorAt = firstError(state.typed, target);
  const column = state.typed.length;
  let expected: Expected | null;
  if (state.finishedAt !== null) expected = null;
  else if (errorAt !== -1) expected = { kind: 'backspace' };
  else if (column < target.length) expected = { kind: 'char', char: target[column]! };
  else expected = { kind: 'enter' };
  return { lineIndex: state.lineIndex, column, errorAt, expected };
}

export function stats(state: TypingState, now: number): TypingStats {
  let elapsedMs = state.activeMs;
  if (state.finishedAt === null && state.lastInputAt !== null) {
    const gap = now - state.lastInputAt;
    if (gap > 0 && gap <= state.options.idleMs) elapsedMs += gap;
  }

  const total = state.lines.reduce((sum, line) => sum + line.length + 1, 0);
  let done = 0;
  if (state.finishedAt !== null) done = total;
  else {
    for (let i = 0; i < state.lineIndex; i++) done += state.lines[i]!.length + 1;
    const errorAt = firstError(state.typed, state.lines[state.lineIndex]!);
    done += errorAt === -1 ? state.typed.length : errorAt;
  }

  const inputs = state.correct + state.incorrect;
  return {
    elapsedMs,
    cpm: elapsedMs > 0 ? state.correct / (elapsedMs / 60_000) : 0,
    accuracy: inputs > 0 ? state.correct / inputs : null,
    correct: state.correct,
    incorrect: state.incorrect,
    progress: done / total,
  };
}
