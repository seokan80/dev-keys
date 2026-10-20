// 명령 카탈로그: Git 세트의 따라치기 줄을 "명령 모양"(도구 · 하위 명령 · 옵션)으로 묶고,
// 줄의 해설 · 실제 출력 · 세트를 예시로, 도전 문제의 설명을 "상황"으로 붙인다. 빌드 때 한 번 (순수 함수).

/** 하위 명령 다음 낱말까지 모양에 넣는 하위 명령 (git stash pop · git remote add …) */
const ACTIONS: Record<string, readonly string[]> = {
  stash: ['push', 'pop', 'list', 'show', 'apply', 'drop', 'branch', 'clear', 'export', 'import'],
  remote: ['add', 'set-url', 'show', 'rename', 'remove', 'prune'],
  submodule: ['add', 'update', 'status', 'init', 'deinit', 'foreach', 'sync'],
  worktree: ['add', 'list', 'remove', 'prune', 'move', 'lock', 'unlock'],
  bisect: ['start', 'good', 'bad', 'new', 'old', 'reset', 'run', 'skip', 'log'],
  'sparse-checkout': ['set', 'add', 'list', 'disable', 'init', 'reapply'],
  maintenance: ['run', 'register', 'unregister', 'start', 'stop', 'is-needed'],
  config: ['list', 'get', 'set', 'unset', 'edit', 'rename-section', 'remove-section'],
};

export type Shape = {
  /** 묶는 열쇠: 옵션을 정렬한 모양 — "git commit --amend -m" */
  key: string;
  /** 주소 조각 — /git/commands/<slug> */
  slug: string;
  tool: 'git' | 'gh';
  /** 하위 명령(동작 · 설정 이름 포함) — "commit", "stash pop", "pr merge", "config pull.rebase" */
  sub: string;
  /** 이 줄에 나온 순서 그대로의 모양 (보여 줄 때) */
  display: string;
};

/** 셸처럼 나눈다 — 따옴표는 낱말 중간에 있어도 묶는다 (--format="%h %s") */
function words(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quote: string | null = null;
  let has = false;
  for (const ch of line) {
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      has = true;
    } else if (/\s/.test(ch)) {
      if (has || cur) out.push(cur);
      cur = '';
      has = false;
    } else {
      cur += ch;
      has = true;
    }
  }
  if (has || cur) out.push(cur);
  return out;
}

/** 옵션 하나를 모양으로: 값은 떼고(--fixup=HEAD~1 → --fixup=), 숫자 옵션은 -<n> */
function flagShape(word: string): string {
  if (/^-\d+$/.test(word)) return '-<n>';
  const eq = word.indexOf('=');
  return eq > 0 ? word.slice(0, eq + 1) : word;
}

const slugPart = (flag: string) =>
  flag === '-'
    ? 'dash'
    : flag === '-<n>'
      ? 'n'
      : flag
          .replace(/^-+/, '')
          .replace(/=$/, '')
          // 점은 빼고 — 주소 끝의 ".rebase" 가 파일 확장자로 읽혀 Workers 정적 자산이 .html 을 찾지 못한다
          .replace(/[^A-Za-z0-9]+/g, '-');

/** 명령 줄 하나의 모양. git · gh 가 아니면 null */
export function shapeOf(line: string): Shape | null {
  const w = words(line.trim());
  const tool = w[0];
  if (tool !== 'git' && tool !== 'gh') return null;
  let i = 1;
  // git -C <폴더> · -c <설정=값> 같은 앞 옵션은 건너뛴다
  while (tool === 'git' && (w[i] === '-C' || w[i] === '-c')) i += 2;
  const head = w[i];
  if (!head || head.startsWith('-')) return null;
  const subWords = [head];
  i += 1;
  if (tool === 'gh' && w[i] && !w[i]!.startsWith('-')) subWords.push(w[i++]!);
  const rest = w.slice(i);

  const flags: string[] = [];
  const positionals: string[] = [];
  let paths = false;
  for (const word of rest) {
    // -- 뒤는 경로 (git diff -- README.md) — 옵션이 아니다
    if (paths) positionals.push(word);
    else if (word === '--') paths = true;
    else if (word === '-') flags.push('-');
    else if (word.startsWith('-') && word.length > 1) flags.push(flagShape(word));
    else positionals.push(word);
  }

  // 동작 단어 (stash pop …). 첫 위치 인자가 동작이면 하위 명령에 넣는다
  const actions = tool === 'git' ? ACTIONS[head] : undefined;
  if (actions && positionals[0] && actions.includes(positionals[0])) subWords.push(positionals.shift()!);

  // config 는 설정 이름별로 — "git config --global pull.rebase true" 와 "git config set --global pull.rebase true" 가 한데
  if (tool === 'git' && head === 'config') {
    const name = positionals.find((p) => /^[A-Za-z][\w-]*(\.[\w"*/-]+)+$/.test(p));
    const action = subWords[1];
    if (name && (!action || action === 'set' || action === 'get' || action === 'unset')) {
      const sub = `config ${name}`;
      return {
        key: `git ${sub}`,
        slug: `config-${slugPart(name)}`,
        tool,
        sub,
        display: line.trim(),
      };
    }
  }

  const uniq = [...new Set(flags)];
  const sub = subWords.join(' ');
  const key = [tool, sub, ...[...uniq].sort()].join(' ');
  const slug = [tool === 'gh' ? 'gh' : null, ...subWords, ...[...uniq].sort().map(slugPart)]
    .filter((p): p is string => !!p)
    .join('-');
  return { key, slug, tool, sub, display: [tool, sub, ...uniq].join(' ') };
}

type SetLike = {
  id: string;
  title: string;
  href: string;
  lines: readonly { text: string; comments: readonly string[]; output: string | null; prompt: string | null }[];
  recalls: readonly { prompt: readonly { text: string }[]; answers: readonly string[] }[];
};

export type CommandExample = {
  /** 따라치는 줄 그대로 */
  text: string;
  /** 줄 위 해설 (앞의 이야기 괄호는 뗀다) */
  note: string | null;
  output: string | null;
  setId: string;
  setTitle: string;
  href: string;
};

export type CommandEntry = Shape & {
  examples: CommandExample[];
  /** 이 명령을 연습하는 세트 (따라치기 줄이나 도전 문제가 있는 곳, 나온 순서) */
  sets: { id: string; title: string; href: string }[];
  /** 도전 문제의 설명 — "이럴 때 쓰는 명령" */
  situations: string[];
};

/** 해설 맨 앞의 이야기 괄호 "(lee 가 … 올렸다) " 를 뗀다 */
const plainNote = (note: string | undefined) => (note ? note.replace(/^\([^)]*\)\s*/, '').trim() || null : null);

/** 세트들로 카탈로그를 만든다 — 예시가 많은 명령부터 */
export function buildCatalog(sets: readonly SetLike[]): CommandEntry[] {
  const byKey = new Map<string, CommandEntry>();
  const displays = new Map<string, Map<string, number>>();
  const entry = (shape: Shape) => {
    let e = byKey.get(shape.key);
    if (!e) {
      e = { ...shape, examples: [], sets: [], situations: [] };
      byKey.set(shape.key, e);
    }
    return e;
  };

  const addSet = (e: CommandEntry, set: SetLike) => {
    if (!e.sets.some((s) => s.id === set.id)) e.sets.push({ id: set.id, title: set.title, href: set.href });
  };

  for (const set of sets) {
    for (const line of set.lines) {
      if (line.prompt !== null) continue;
      const shape = shapeOf(line.text);
      if (!shape) continue;
      addSet(entry(shape), set);
      entry(shape).examples.push({
        text: line.text,
        note: plainNote(line.comments.at(-1)),
        output: line.output,
        setId: set.id,
        setTitle: set.title,
        href: set.href,
      });
      const count = displays.get(shape.key) ?? new Map<string, number>();
      count.set(shape.display, (count.get(shape.display) ?? 0) + 1);
      displays.set(shape.key, count);
    }
    for (const recall of set.recalls) {
      const shape = shapeOf(recall.answers[0] ?? '');
      if (!shape) continue;
      const situation = recall.prompt.map((p) => p.text).join('');
      const e = entry(shape);
      addSet(e, set);
      if (!e.situations.includes(situation)) e.situations.push(situation);
    }
  }

  // 보여 줄 모양: 가장 많이 나온 순서 (config 는 예시 줄 그대로라 짧은 쪽)
  for (const [key, count] of displays) {
    const e = byKey.get(key)!;
    if (e.tool === 'git' && e.sub.startsWith('config ')) continue;
    e.display = [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0]![0];
  }

  return [...byKey.values()].sort((a, b) => b.examples.length - a.examples.length || a.key.localeCompare(b.key));
}
