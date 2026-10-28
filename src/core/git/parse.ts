import type { GitError } from './types';

export type Parsed = { name: string; args: string[] };

/** 따옴표·이스케이프만 푼다. 변수·명령 치환은 실행하지 않는다. C2' 같은 학습용 라벨만 예외로 보존한다. */
export function tokenize(input: string): string[] | null {
  const tokens: string[] = [];
  let current = '';
  let quote: string | null = null;
  let started = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
    if (!quote && !started) {
      const label = /^C\d+'+(?:[~^]\d*)*(?=\s|$)/i.exec(input.slice(i))?.[0];
      if (label) {
        tokens.push(label);
        i += label.length - 1;
        continue;
      }
    }
    if (quote === "'") {
      if (ch === quote) quote = null;
      else current += ch;
    } else if (ch === '\\') {
      const next = input[i + 1];
      if (next === undefined) return null;
      if (quote === '"' && !['$', '`', '"', '\\', '\n'].includes(next)) current += ch;
      else {
        if (next !== '\n') current += next;
        i++;
      }
      started = true;
    } else if (quote === '"') {
      if (ch === quote) quote = null;
      else current += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      started = true;
    } else if (/\s/.test(ch)) {
      if (started) tokens.push(current);
      current = '';
      started = false;
    } else {
      current += ch;
      started = true;
    }
  }
  if (quote) return null;
  if (started) tokens.push(current);
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

  const missing = (option: string): GitError => ({
    message: `error: switch \`${option.replace(/^-+/, '')}' requires a value`,
    hint: `${option} 뒤에 값을 적어야 한다`,
  });
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--') {
      out.positionals.push(...args.slice(i + 1));
      break;
    }
    if (arg === '-' || !arg.startsWith('-')) out.positionals.push(arg);
    else if (flags.has(arg)) out.flags.add(arg);
    else if (values.has(arg)) {
      const value = args[++i];
      if (value === undefined) return missing(arg);
      out.values.set(arg, value);
    } else if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      const option = arg.slice(0, eq);
      if (eq < 0 || !values.has(option)) return unknownOption(arg);
      out.values.set(option, arg.slice(eq + 1));
    } else {
      for (let j = 1; j < arg.length; j++) {
        const option = `-${arg[j]}`;
        if (flags.has(option)) out.flags.add(option);
        else if (values.has(option)) {
          const value = arg.slice(j + 1) || args[++i];
          if (value === undefined) return missing(option);
          out.values.set(option, value);
          break;
        } else return unknownOption(arg);
      }
    }
  }
  return out;
}

export const isError = (x: unknown): x is GitError =>
  typeof x === 'object' && x !== null && 'message' in x && 'hint' in x;
