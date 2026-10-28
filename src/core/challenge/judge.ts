import { SUPPORTED_COMMANDS, compare, execute, initialRepo, tokenize, type ExecResult, type RepoState } from '../git';

/** 뜻 보고 치기 한 문제. answers 는 placeholder 를 채운 정답들 (첫 번째가 대표 정답) */
export type RecallQuestion = {
  answers: readonly string[];
  /** Shell은 따옴표·연산자 의미를 보존해 명시한 답과만 비교한다. */
  match?: 'literal';
  /** 이 상태에서 엔진으로 실행해 동의어를 판정한다 (Git 문제) */
  context?: { setup: readonly string[] } | null;
};

export type Verdict = { correct: boolean; via: 'text' | 'engine' | null };

const WRONG: Verdict = { correct: false, via: null };

/** 셸처럼 나눈 토큰. 정답이 git 으로 시작하면 입력 앞의 git 은 빼도 된다 */
function tokensOf(text: string, gitAnswer: boolean): string[] | null {
  const tokens = tokenize(text);
  if (tokens === null) return null;
  return gitAnswer && tokens[0] !== 'git' ? ['git', ...tokens] : tokens;
}

/** 글자 그대로 비교. 공백 개수 · 따옴표 종류 차이는 무시한다 */
export function sameCommand(input: string, answer: string, match?: 'literal'): boolean {
  if (match === 'literal') return input.trim() === answer.trim();
  const gitAnswer = tokenize(answer)?.[0] === 'git';
  const a = tokensOf(input, gitAnswer);
  const b = tokensOf(answer, gitAnswer);
  if (a === null || b === null) return input.trim().split(/\s+/).join(' ') === answer.trim().split(/\s+/).join(' ');
  return a.length === b.length && a.every((t, i) => t === b[i]);
}

/** 새로 생긴 커밋들의 메시지 (만든 순서) */
const newMessages = (state: RepoState, base: RepoState) =>
  Object.values(state.commits)
    .filter((c) => !base.commits[c.id])
    .sort((x, y) => Number(x.id.slice(1)) - Number(y.id.slice(1)))
    .map((c) => c.message ?? '');

/** 결과 트리 + reset 모드 + 새 커밋 메시지가 같으면 같은 명령으로 본다 */
function sameResult(a: ExecResult, b: ExecResult, base: RepoState): boolean {
  if (!compare(a.state, b.state, base).equal) return false;
  if (a.info.resetMode !== b.info.resetMode) return false;
  const ma = newMessages(a.state, base);
  const mb = newMessages(b.state, base);
  return ma.length === mb.length && ma.every((m, i) => m === mb[i]);
}

function setupState(setup: readonly string[]): RepoState | null {
  let state = initialRepo();
  for (const command of setup) {
    const r = execute(state, command);
    if (r.error) return null;
    state = r.state;
  }
  return state;
}

/**
 * 판정: 정답 목록과 글자 비교 → 맞지 않고 context 가 있으면 엔진으로 실행해 결과 비교 (구현계획 4.5).
 * 그래서 목록에 없는 동의어(reset --hard HEAD^ = HEAD~1)도 정답이고, 결과 트리가 같아도 reset 모드가 다르면 오답이다
 */
export function judge(question: RecallQuestion, input: string): Verdict {
  if (input.trim() === '') return WRONG;
  if (question.answers.some((a) => sameCommand(input, a, question.match))) return { correct: true, via: 'text' };
  if (!question.context || question.match === 'literal') return WRONG;

  const tokens = tokensOf(input, true);
  if (!tokens || !SUPPORTED_COMMANDS.includes(tokens[1] ?? '')) return WRONG;
  const base = setupState(question.context.setup);
  if (!base) return WRONG;
  const mine = execute(base, input);
  if (mine.error) return WRONG;
  for (const answer of question.answers) {
    const r = execute(base, answer);
    if (!r.error && sameResult(mine, r, base)) return { correct: true, via: 'engine' };
  }
  return WRONG;
}

/**
 * 첫 단어 힌트. Git 은 모두 git 으로 시작하니 하위 명령까지 (git switch).
 * 그 단어가 곧 정답 전체면(git init) 첫 글자만 (git i)
 */
export function hintOf(answer: string): string {
  const words = answer.trim().split(/\s+/);
  const lead = words[0] === 'git' ? 1 : 0;
  const word = words[lead] ?? '';
  const shown = words.length > lead + 1 ? word : word.slice(0, 1);
  return [...words.slice(0, lead), shown].join(' ');
}
