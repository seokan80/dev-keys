import { describe, expect, it } from 'vitest';
import {
  apply,
  completeLine,
  createSession,
  cursor,
  pause,
  stats,
  type TypingOptions,
  type TypingState,
} from '@core/typing';

const T0 = 1_000_000;

/** text 를 한 글자씩 입력한다. '\n' 은 Enter, '\b' 는 Backspace. */
function type(state: TypingState, text: string, start = T0, step = 100): TypingState {
  let s = state;
  [...text].forEach((ch, i) => {
    const now = start + i * step;
    if (ch === '\n') s = apply(s, { kind: 'enter' }, now);
    else if (ch === '\b') s = apply(s, { kind: 'backspace' }, now);
    else s = apply(s, { kind: 'char', char: ch }, now);
  });
  return s;
}

const session = (lines: string[], options: Partial<TypingOptions> = {}) =>
  createSession(lines, { autoIndent: false, ...options });

describe('createSession', () => {
  it('처음 상태', () => {
    const s = session(['git status']);
    expect(cursor(s)).toEqual({ lineIndex: 0, column: 0, errorAt: -1, expected: { kind: 'char', char: 'g' } });
    expect(s.finishedAt).toBeNull();
  });

  it('빈 줄 목록은 받지 않는다', () => {
    expect(() => createSession([])).toThrow();
  });

  it('기본 옵션: 자동 들여쓰기 켬, 오타 뒤 5자, 무입력 10초', () => {
    expect(createSession(['a']).options).toEqual({ autoIndent: true, maxErrorTail: 5, idleMs: 10_000 });
  });
});

describe('정확 입력', () => {
  it('끝까지 치고 Enter 를 누르면 끝난다', () => {
    const s = type(session(['ab']), 'ab\n');
    expect(s.finishedAt).not.toBeNull();
    expect(stats(s, T0 + 10_000)).toMatchObject({ correct: 3, incorrect: 0, accuracy: 1, progress: 1 });
    expect(cursor(s).expected).toBeNull();
  });

  it('여러 줄은 줄마다 Enter 로 넘어간다', () => {
    let s = type(session(['ab', 'cd']), 'ab\n');
    expect(cursor(s)).toMatchObject({ lineIndex: 1, column: 0 });
    s = type(s, 'cd\n', T0 + 1000);
    expect(s.finishedAt).not.toBeNull();
  });

  it('빈 줄은 Enter 만 누른다', () => {
    expect(type(session(['a', '', 'b']), 'a\n\nb\n').finishedAt).not.toBeNull();
  });

  it('끝난 뒤의 입력은 무시한다', () => {
    const done = type(session(['a']), 'a\n');
    expect(type(done, 'xyz\b\n', T0 + 5000)).toBe(done);
  });
});

describe('오타', () => {
  it('틀린 글자는 백스페이스로 고쳐야 진행된다', () => {
    let s = type(session(['abc']), 'ax');
    expect(cursor(s)).toMatchObject({ column: 2, errorAt: 1, expected: { kind: 'backspace' } });
    s = type(s, '\n', T0 + 300); // 오타가 있으면 Enter 도 오타로 쌓인다
    expect(s.finishedAt).toBeNull();
    s = type(s, '\b\bbc\n', T0 + 400);
    expect(s.finishedAt).not.toBeNull();
    // 맞게 친 것: a b c Enter = 4, 틀린 것: x Enter = 2
    expect(stats(s, 0)).toMatchObject({ correct: 4, incorrect: 2, accuracy: 4 / 6 });
  });

  it('오타 뒤에 친 글자는 우연히 맞아도 오타다', () => {
    const s = type(session(['abc']), 'axc');
    expect(cursor(s).errorAt).toBe(1);
    expect(stats(s, 0)).toMatchObject({ correct: 1, incorrect: 2 });
  });

  it('틀린 글자 뒤로 5자까지만 쌓이고, 그 뒤 입력은 무시하되 오타로 센다', () => {
    const s = type(session(['abcdefghijklmnop']), 'xyyyyyyy'); // 틀린 x + 7자
    expect(s.typed).toBe('xyyyyy'); // x + 5자
    expect(stats(s, 0).incorrect).toBe(8);
  });

  it('상한 수는 옵션으로 바꿀 수 있다', () => {
    expect(type(session(['abcdef'], { maxErrorTail: 0 }), 'xyz').typed).toBe('x');
  });

  it('줄을 다 친 뒤 더 친 글자는 오타다', () => {
    const s = type(session(['ab', 'c']), 'abz');
    expect(cursor(s)).toMatchObject({ lineIndex: 0, errorAt: 2, expected: { kind: 'backspace' } });
  });
});

describe('백스페이스', () => {
  it('줄 처음에서는 아무 일도 없고, 이전 줄로 돌아가지 않는다', () => {
    const s0 = session(['ab', 'cd']);
    expect(type(s0, '\b').typed).toBe('');
    const s1 = type(s0, 'ab\n\b', T0);
    expect(cursor(s1)).toMatchObject({ lineIndex: 1, column: 0 });
  });

  it('정확도 계산에 들어가지 않는다', () => {
    const s = type(session(['ab']), 'a\b');
    expect(stats(s, 0)).toMatchObject({ correct: 1, incorrect: 0, accuracy: 1 });
  });
});

describe('자동 들여쓰기', () => {
  const code = ['if (x) {', '  y();', '}'];

  it('켜면 다음 줄 앞 공백이 미리 채워지고 타수에 들어가지 않는다', () => {
    let s = type(createSession(code, { autoIndent: true }), 'if (x) {\n');
    expect(s.typed).toBe('  ');
    expect(cursor(s)).toMatchObject({ lineIndex: 1, column: 2, expected: { kind: 'char', char: 'y' } });
    s = type(s, 'y();\n}\n', T0 + 2000);
    expect(s.finishedAt).not.toBeNull();
    expect(stats(s, 0).correct).toBe(9 + 5 + 2);
  });

  it('미리 채운 공백은 백스페이스로 지워지지 않는다', () => {
    const s = type(createSession(code, { autoIndent: true }), 'if (x) {\n\b\b\b');
    expect(s.typed).toBe('  ');
  });

  it('첫 줄이 들여쓰기로 시작해도 채운다', () => {
    expect(createSession(['    return 1;'], { autoIndent: true }).typed).toBe('    ');
  });

  it('끄면 공백도 직접 친다', () => {
    const s = type(session(code), 'if (x) {\n  y();\n}\n');
    expect(s.finishedAt).not.toBeNull();
    expect(stats(s, 0).correct).toBe(9 + 7 + 2);
  });
});

describe('시간', () => {
  it('첫 입력부터 마지막 입력까지 잰다', () => {
    const s = type(session(['abcd']), 'abcd\n', T0, 1000); // 0, 1, 2, 3, 4초
    expect(stats(s, T0 + 999_999)).toMatchObject({ elapsedMs: 4000, cpm: 5 / (4000 / 60_000) });
  });

  it('10초 넘는 무입력 구간은 뺀다', () => {
    let s = type(session(['abc']), 'a', T0);
    s = type(s, 'b', T0 + 15_000); // 15초 쉼 → 빼기
    s = type(s, 'c', T0 + 16_000); // 1초 → 넣기
    expect(stats(s, T0 + 16_000).elapsedMs).toBe(1000);
  });

  it('10초 이하 쉼은 넣는다', () => {
    let s = type(session(['ab']), 'a', T0);
    s = type(s, 'b', T0 + 10_000);
    expect(stats(s, T0 + 10_000).elapsedMs).toBe(10_000);
  });

  it('pause(탭 이탈) 뒤의 구간은 뺀다', () => {
    let s = type(session(['abc']), 'a', T0);
    s = pause(s);
    s = type(s, 'b', T0 + 3000);
    s = type(s, 'c', T0 + 3500);
    expect(stats(s, T0 + 3500).elapsedMs).toBe(500);
  });

  it('진행 중에는 마지막 입력 뒤 지금까지(10초 이하)를 더한다', () => {
    const s = type(session(['abc']), 'ab', T0, 1000);
    expect(stats(s, T0 + 1000 + 500).elapsedMs).toBe(1500);
    expect(stats(s, T0 + 1000 + 20_000).elapsedMs).toBe(1000);
  });

  it('입력 전에는 0', () => {
    expect(stats(session(['a']), T0)).toMatchObject({ elapsedMs: 0, cpm: 0, accuracy: null, progress: 0 });
  });
});

describe('진행률', () => {
  it('맞게 친 글자 수 / 전체 글자 수(줄바꿈 포함)', () => {
    const s = type(session(['ab', 'cd']), 'ab\nc');
    expect(stats(s, 0).progress).toBeCloseTo(4 / 6);
  });
});

describe('입력 검사', () => {
  it('한 글자가 아닌 char 입력은 무시한다', () => {
    const s = session(['ab']);
    expect(apply(s, { kind: 'char', char: 'ab' }, T0)).toBe(s);
    expect(apply(s, { kind: 'char', char: '' }, T0)).toBe(s);
  });
});

describe('completeLine — 검수 모드: 지금 줄을 정답으로 채운다', () => {
  it('남은 글자를 채우고 Enter 앞에서 멈춘다', () => {
    const s = completeLine(type(session(['git status', 'git log']), 'git s'), T0 + 1000);
    expect(s.typed).toBe('git status');
    expect(s.lineIndex).toBe(0);
    expect(cursor(s).expected).toEqual({ kind: 'enter' });
  });

  it('오타가 있으면 오타부터 지운다 (잘못 친 Enter 포함)', () => {
    const s = completeLine(type(session(['git status']), 'git sx\n'), T0 + 1000);
    expect(s.typed).toBe('git status');
    expect(cursor(s).errorAt).toBe(-1);
  });

  it('들여쓰기 자동 입력이면 잠긴 앞부분은 그대로 두고 채운다', () => {
    const s0 = apply(createSession(['a', '  b()'], { autoIndent: true }), { kind: 'char', char: 'a' }, T0);
    const s = completeLine(apply(s0, { kind: 'enter' }, T0 + 100), T0 + 200);
    expect(s.typed).toBe('  b()');
  });

  it('이미 다 쳤거나 끝난 세션은 그대로', () => {
    const done = type(session(['ab']), 'ab');
    expect(completeLine(done, T0 + 1000)).toBe(done);
    const finished = type(session(['ab']), 'ab\n');
    expect(completeLine(finished, T0 + 1000)).toBe(finished);
  });
});
