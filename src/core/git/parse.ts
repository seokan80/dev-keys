import type { GitError } from './types';

export type Parsed = { name: string; args: string[] };

/** 셸처럼 나눈다. 토큰이 따옴표로 시작하면 짝이 맞는 따옴표까지 한 덩어리 (라벨 C3' 의 ' 는 그대로 둔다) */
export function tokenize(input: string): string[] | null {
  const tokens: string[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i]!;
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const end = input.indexOf(ch, i + 1);
      if (end === -1) return null;
      tokens.push(input.slice(i + 1, end));
      i = end + 1;
      continue;
    }
    let j = i;
    while (j < input.length && !/\s/.test(input[j]!)) j += 1;
    tokens.push(input.slice(i, j));
    i = j;
  }
  return tokens;
}

export function parseCommand(input: string): Parsed | GitError {
  const tokens = tokenize(input);
  if (tokens === null) {
    return { message: 'error: unterminated quote', hint: '따옴표(" 또는 \')가 닫히지 않았다' };
  }
  const rest = tokens[0] === 'git' ? tokens.slice(1) : tokens;
  if (rest.length === 0)
    return { message: 'usage: git <command> [<args>]', hint: 'git 명령을 입력하세요 (예: git commit)' };
  return { name: rest[0]!, args: rest.slice(1) };
}

export type OptionSpec = {
  /** 값 없이 켜는 옵션 */
  flags?: readonly string[];
  /** 다음 칸을 값으로 받는 옵션 */
  values?: readonly string[];
};

export type Options = { flags: Set<string>; values: Map<string, string>; positionals: string[] };

const unknownOption = (opt: string): GitError => ({
  message: `error: unknown option '${opt}'`,
  hint: '이 연습에서 지원하지 않는 옵션이에요',
});

/** 옵션 풀이. -am 처럼 붙여 쓴 짧은 옵션도 푼다. "-" 하나는 위치 인자(switch -) */
export function parseOptions(args: readonly string[], spec: OptionSpec): Options | GitError {
  const flags = new Set(spec.flags ?? []);
  const values = new Set(spec.values ?? []);
  const out: Options = { flags: new Set(), values: new Map(), positionals: [] };

  const expanded: string[] = [];
  for (const arg of args) {
    // 붙여 쓴 짧은 옵션: -am → -a -m
    if (/^-[a-zA-Z]{2,}$/.test(arg) && [...arg.slice(1)].every((c) => flags.has(`-${c}`) || values.has(`-${c}`))) {
      expanded.push(...[...arg.slice(1)].map((c) => `-${c}`));
    } else expanded.push(arg);
  }

  for (let i = 0; i < expanded.length; i++) {
    const arg = expanded[i]!;
    if (arg === '-' || !arg.startsWith('-')) {
      out.positionals.push(arg);
    } else if (flags.has(arg)) {
      out.flags.add(arg);
    } else if (values.has(arg)) {
      const value = expanded[i + 1];
      if (value === undefined) {
        return {
          message: `error: switch \`${arg.replace(/^-+/, '')}' requires a value`,
          hint: `${arg} 뒤에 값을 적어야 한다`,
        };
      }
      out.values.set(arg, value);
      i += 1;
    } else return unknownOption(arg);
  }
  return out;
}

export const isError = (x: unknown): x is GitError =>
  typeof x === 'object' && x !== null && 'message' in x && 'hint' in x;
