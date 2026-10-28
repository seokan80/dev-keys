/** 입문용 Vim의 지원 범위. 본문·커서·모드는 불변 값으로 다룬다. */
export type Cursor = { row: number; col: number };
type Snapshot = { lines: string[]; cursor: Cursor };
type Change = { before: Snapshot; after: Snapshot };
export type VimCheck = 'saved' | 'register';
export type VimState = {
  lines: string[];
  cursor: Cursor;
  mode: 'normal' | 'insert' | 'command' | 'search';
  saved: string[];
  closed: boolean;
  pending: string;
  command: string;
  lastSearch: string;
  register: { kind: 'line' | 'char'; text: string[] } | null;
  undo: Change[];
  redo: Change[];
  insertion: { before: Snapshot; at: Cursor } | null;
  preferred: number | 'end';
  error: string | null;
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const first = (line: string) =>
  Math.min(line.search(/[^ ]/) < 0 ? 0 : line.search(/[^ ]/), Math.max(0, line.length - 1));
const bound = (lines: readonly string[], cursor: Cursor, insert = false): Cursor => {
  const row = Math.max(0, Math.min(cursor.row, lines.length - 1));
  return { row, col: Math.max(0, Math.min(cursor.col, Math.max(0, lines[row]!.length - (insert ? 0 : 1)))) };
};
export function createVim(lines: readonly string[]): VimState {
  if (lines.length === 0 || lines.some((line) => /[^\x20-\x7e]/.test(line)))
    throw new Error('Vim 연습 본문은 빈 배열이 아닌 ASCII 줄 목록이어야 한다');
  return {
    lines: [...lines],
    cursor: { row: 0, col: 0 },
    mode: 'normal',
    saved: [...lines],
    closed: false,
    pending: '',
    command: '',
    lastSearch: '',
    register: null,
    undo: [],
    redo: [],
    insertion: null,
    preferred: 0,
    error: null,
  };
}
const fail = (s: VimState, message: string): VimState => ({ ...s, pending: '', error: message });
const move = (s: VimState, cursor: Cursor, preferred?: number | 'end'): VimState => {
  const next = bound(s.lines, cursor, s.mode === 'insert');
  return { ...s, cursor: next, preferred: preferred ?? next.col };
};
function change(s: VimState, lines: string[], cursor: Cursor, undoCursor = s.cursor, redoCursor = cursor): VimState {
  const entry = {
    before: { lines: s.lines, cursor: bound(s.lines, undoCursor) },
    after: { lines, cursor: bound(lines, redoCursor) },
  };
  return {
    ...s,
    lines,
    cursor: bound(lines, cursor),
    preferred: bound(lines, cursor).col,
    undo: same(lines, s.lines) ? s.undo : [...s.undo, entry],
    redo: [],
    pending: '',
  };
}
function insert(s: VimState, col: number): VimState {
  const at = { ...s.cursor, col };
  return {
    ...s,
    mode: 'insert',
    cursor: at,
    insertion: { before: { lines: s.lines, cursor: bound(s.lines, at) }, at },
    pending: '',
  };
}
function search(s: VimState, pattern: string, backwards = false): VimState {
  if (!pattern) return fail(s, '먼저 /로 찾을 단어를 입력하세요');
  if (/[^A-Za-z0-9 _-]/.test(pattern))
    return fail(s, '이번 연습은 영문·숫자·공백 단어 검색만 지원해요. 정규식은 아직 지원하지 않아요');
  const hits: Cursor[] = [];
  s.lines.forEach((line, row) => {
    for (let col = 0; col <= line.length - pattern.length; col++)
      if (line.startsWith(pattern, col)) hits.push({ row, col });
  });
  const offset = (c: Cursor) => s.lines.slice(0, c.row).reduce((n, line) => n + line.length + 1, 0) + c.col;
  const current = offset(s.cursor);
  const ordered = backwards ? [...hits].reverse() : hits;
  const target = ordered.find((c) => (backwards ? offset(c) < current : offset(c) > current)) ?? ordered[0];
  return target ? { ...move(s, target), lastSearch: pattern } : fail(s, `찾는 단어가 없어요: ${pattern}`);
}

/** 키는 한 글자 또는 <Esc> · <CR> · <BS> · <C-r>. 지원 밖 명령은 본문을 바꾸지 않고 거절한다. */
export function pressVim(state: VimState, key: string): VimState {
  if (state.closed) return state;
  let s: VimState = { ...state, error: null };
  const { row, col } = s.cursor;
  const line = s.lines[row]!;
  const printable = key.length === 1 && key >= ' ' && key <= '~';
  if (s.mode === 'insert') {
    if (key === '<Esc>') {
      const start = s.insertion!;
      const history: Change = { before: start.before, after: { lines: s.lines, cursor: bound(s.lines, start.at) } };
      return {
        ...s,
        mode: 'normal',
        cursor: bound(s.lines, { row, col: col - 1 }),
        insertion: null,
        undo: same(start.before.lines, s.lines) ? s.undo : [...s.undo, history],
        redo: same(start.before.lines, s.lines) ? s.redo : [],
        preferred: Math.max(0, col - 1),
      };
    }
    const lines = [...s.lines];
    if (key === '<CR>') {
      lines.splice(row, 1, line.slice(0, col), line.slice(col));
      return { ...s, lines, cursor: { row: row + 1, col: 0 } };
    }
    if (key === '<BS>') {
      if (col > 0) {
        lines[row] = line.slice(0, col - 1) + line.slice(col);
        return { ...s, lines, cursor: { row, col: col - 1 } };
      }
      if (row > 0) {
        const previous = lines[row - 1]!;
        lines.splice(row - 1, 2, previous + line);
        return { ...s, lines, cursor: { row: row - 1, col: previous.length } };
      }
      return s;
    }
    if (printable) {
      lines[row] = line.slice(0, col) + key + line.slice(col);
      return { ...s, lines, cursor: { row, col: col + 1 } };
    }
    return fail(s, '입력 모드에서는 영문·기호, Enter, Backspace, Esc를 사용하세요');
  }
  if (s.mode === 'command' || s.mode === 'search') {
    if (key === '<Esc>') return { ...s, mode: 'normal', command: '' };
    if (key === '<BS>') return { ...s, command: s.command.slice(0, -1), mode: s.command ? s.mode : 'normal' };
    if (key === '<CR>') {
      const command = s.command;
      const mode = s.mode;
      s = { ...s, mode: 'normal', command: '' };
      if (mode === 'search') return search(s, command || s.lastSearch);
      if (command === 'w' || command === 'wq') return { ...s, saved: [...s.lines], closed: command === 'wq' };
      if (command === 'q!') return { ...s, closed: true };
      if (command === 'q')
        return same(s.lines, s.saved)
          ? { ...s, closed: true }
          : fail(s, 'E37: 저장하지 않은 변경이 있어요. :w로 저장하거나 :q!로 버릴 수 있어요');
      return fail(s, '이번 연습은 :w · :q · :q! · :wq를 지원해요');
    }
    return printable ? { ...s, command: s.command + key } : fail(s, '명령을 입력하고 Enter 또는 Esc를 누르세요');
  }
  if (key === '<Esc>') return { ...s, pending: '' };
  if (s.pending) {
    const pending = s.pending;
    s = { ...s, pending: '' };
    if (pending === 'g' && key === 'g') return move(s, { row: 0, col: first(s.lines[0]!) });
    if (pending === 'r' && printable && line.length > 0) {
      const lines = [...s.lines];
      lines[row] = line.slice(0, col) + key + line.slice(col + 1);
      return change(s, lines, s.cursor);
    }
    if (pending === 'y' && key === 'y') return { ...s, register: { kind: 'line', text: [line] } };
    if (pending === 'd' && key === 'd') {
      const lines = s.lines.filter((_, i) => i !== row);
      if (!lines.length) lines.push('');
      const nextRow = Math.min(row, lines.length - 1);
      return {
        ...change(s, lines, { row: nextRow, col: first(lines[nextRow]!) }, { row, col: first(line) }),
        register: { kind: 'line', text: [line] },
      };
    }
    return fail(s, '이번 연습의 조합 키는 gg · dd · yy · r 뒤 한 글자예요');
  }
  if (['g', 'd', 'y', 'r'].includes(key)) return { ...s, pending: key };
  if (key === 'h') return move(s, { row, col: col - 1 });
  if (key === 'l') return move(s, { row, col: col + 1 });
  if (key === 'j' || key === 'k')
    return move(
      s,
      { row: row + (key === 'j' ? 1 : -1), col: s.preferred === 'end' ? Number.MAX_SAFE_INTEGER : s.preferred },
      s.preferred,
    );
  if (key === '0') return move(s, { row, col: 0 });
  if (key === '$') return move(s, { row, col: Math.max(0, line.length - 1) }, 'end');
  if (key === 'G') return move(s, { row: s.lines.length - 1, col: first(s.lines.at(-1)!) });
  if (key === 'i') return insert(s, col);
  if (key === 'a') return insert(s, line.length ? col + 1 : 0);
  if (key === 'I') return insert(s, first(line));
  if (key === 'A') return insert(s, line.length);
  if (key === 'x') {
    if (!line.length) return s;
    const lines = [...s.lines];
    lines[row] = line.slice(0, col) + line.slice(col + 1);
    return { ...change(s, lines, bound(lines, s.cursor)), register: { kind: 'char', text: [line[col]!] } };
  }
  if (key === 'p' || key === 'P') {
    if (!s.register) return fail(s, '먼저 yy로 줄을 복사하세요');
    const lines = [...s.lines];
    if (s.register.kind === 'line') {
      const at = row + (key === 'p' ? 1 : 0);
      lines.splice(at, 0, ...s.register.text);
      const anchor = { row, col: first(line) };
      return change(s, lines, { row: at, col: first(s.register.text[0]!) }, anchor, anchor);
    }
    const at = col + (key === 'p' && line.length ? 1 : 0);
    const text = s.register.text.join('\n');
    lines[row] = line.slice(0, at) + text + line.slice(at);
    return change(s, lines, { row, col: at + text.length - 1 }, s.cursor, s.cursor);
  }
  if (key === 'u' || key === '<C-r>') {
    const from = key === 'u' ? s.undo : s.redo;
    const entry = from.at(-1);
    if (!entry) return fail(s, '더 되돌리거나 다시 실행할 변경이 없어요');
    const target = key === 'u' ? entry.before : entry.after;
    return {
      ...s,
      lines: target.lines,
      cursor: target.cursor,
      preferred: target.cursor.col,
      undo: key === 'u' ? from.slice(0, -1) : [...s.undo, entry],
      redo: key === 'u' ? [...s.redo, entry] : from.slice(0, -1),
    };
  }
  if (key === '/' || key === ':') return { ...s, mode: key === '/' ? 'search' : 'command', command: '' };
  if (key === 'n' || key === 'N') return search(s, s.lastSearch, key === 'N');
  return fail(s, '이번 연습에서 지원하지 않는 키예요. 지원 키 안내를 확인하세요');
}
export function vimKeys(notation: string): string[] {
  const keys: string[] = [];
  for (let i = 0; i < notation.length;) {
    const token = /^(<Esc>|<CR>|<BS>|<C-r>)/.exec(notation.slice(i))?.[0];
    keys.push(token ?? notation[i]!);
    i += token?.length ?? 1;
  }
  return keys;
}
export const playVim = (state: VimState, notation: string): VimState => vimKeys(notation).reduce(pressVim, state);
export function matchesVim(actual: VimState, goal: VimState, checks: readonly VimCheck[] = []): boolean {
  return (
    !actual.error &&
    actual.mode === goal.mode &&
    actual.closed === goal.closed &&
    actual.pending === goal.pending &&
    same(actual.lines, goal.lines) &&
    same(actual.cursor, goal.cursor) &&
    checks.every((key) => same(actual[key], goal[key]))
  );
}

/** 권장 키로 목표를 만든다. 입력 중간 단계도 허용하되 명령·조합은 끝나야 한다. */
export function vimCheckpoints(lesson: {
  initial: readonly string[];
  steps: readonly { id: string; keys: string; checks?: readonly VimCheck[] }[];
}): { start: VimState; goal: VimState }[] {
  let state = createVim(lesson.initial);
  return lesson.steps.map((step) => {
    const start = state;
    for (const key of vimKeys(step.keys)) {
      state = pressVim(state, key);
      if (state.error) throw new Error(`${step.id}: ${state.error}`);
    }
    if (state.pending || state.mode === 'command' || state.mode === 'search')
      throw new Error(`${step.id}: 명령이 끝나지 않았다`);
    if (matchesVim(start, state, step.checks)) throw new Error(`${step.id}: 풀이가 목표 상태를 바꾸지 않는다`);
    return { start, goal: state };
  });
}
