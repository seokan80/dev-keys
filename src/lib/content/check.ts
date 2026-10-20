import { parse } from 'yaml';
import { judge } from '../../core/challenge';
import { execute, initialRepo, layoutTree, type RepoState, type TreeLayout } from '../../core/git';
import { srsKey } from '../../core/srs';
import { CATEGORY_IDS, type CategoryId } from '../../schemas/categories';
import { setSchema, type CopyItem, type RecallItem, type Scene, type SetData } from '../../schemas/set';

export type RawFile = { path: string; text: string };
export type Problem = { path: string; message: string; level: 'error' | 'warning' };

/**
 * engine 세트의 커밋 그래프 (타자 영역 옆에 늘 보인다). steps 는 상태가 바뀔 때마다 하나씩.
 * 배치는 한 번 정한 자리를 바꾸지 않으므로 마지막 배치 하나로 모든 단계를 그린다 (그 단계에 없는 커밋은 그리지 않는다)
 */
export type SetGraph = {
  steps: RepoState[];
  layout: TreeLayout;
  /** 커밋 id → 그래프에 보일 설명 (해시 + 메시지) */
  names: Record<string, string>;
};

/** 이 줄을 치는 동안 · 끝낸 뒤 보여 줄 그래프 단계, 끝낸 뒤 그래프 아래 설명 (tree.caption) */
export type LineGraph = { during: number; after: number; caption: string | null };

/**
 * 따라칠 한 줄. 모두 치지 않는 것:
 * comments 는 그 줄 위에 주석처럼, output 은 줄을 다 치면 아래에, scene 은 Enter 뒤에 그림으로, graph 는 옆 그래프의 단계
 */
export type CodeLine = {
  text: string;
  comments: string[];
  output: string | null;
  scene: Scene | null;
  graph: LineGraph | null;
  /** 대화형 답 줄이면 앞에 보일 질문 ($ 대신) */
  prompt: string | null;
  itemId: string;
};

/** 뜻 보고 치기 한 문제 (placeholder 를 채운 것). prompt 는 채운 값(value)을 따로 표시할 수 있게 조각으로 */
export type RecallLine = {
  /** 오답 기록 키 `${setId}/${itemId}` */
  key: string;
  setId: string;
  itemId: string;
  prompt: { text: string; value: boolean }[];
  /** 첫 번째가 대표 정답 */
  answers: string[];
  context: { setup: string[] } | null;
  note: string | null;
};

export type ContentSet = SetData & {
  slug: string;
  href: string;
  /** 저장소 기준 파일 경로 */
  file: string;
  /** 기본 모드에서 따라칠 줄 (따라치기 문제를 순서대로 이어 붙인 것) */
  lines: CodeLine[];
  /** 도전 모드 문제 (없으면 도전 모드가 없다) */
  recalls: RecallLine[];
  /** engine 세트의 커밋 그래프 */
  graph: SetGraph | null;
};

const RESERVED_SLUGS = new Set(['challenge', 'tree', 'index', 'commands']);
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** 한 줄 길이: 코드는 읽기 좋게 80자, 터미널 명령(Git)은 한 줄로 길어지기 쉬워 100자 */
const MAX_LINE = 80;
const MAX_COMMAND_LINE = 100;
/** 출력 한 줄 — 화면에서 넘치면 다음 줄로 이어지니 실제 도구 출력을 자르지 않을 만큼 */
const MAX_OUTPUT_LINE = 120;
/** 출력에는 ASCII 와, CLI 도구(gh 등)가 찍는 기호만 (치는 글이 아니어서) */
const OUTPUT_SYMBOLS = new Set(['✓', '✗', '•', '→', '…']);
/** 예상 시간 계산 기준 (분당 타수) */
const CPM = 200;
const PLACEHOLDER = /<([a-z][a-z0-9_]*)>/g;

const charLabel = (ch: string) => (ch === '\t' ? '탭' : `"${ch}"(U+${ch.codePointAt(0)!.toString(16).toUpperCase()})`);

/** YAML 블록(|)이 붙이는 마지막 줄바꿈 하나는 떼어 낸다 */
const linesOf = (text: string) => text.replace(/\n$/, '').split('\n');

function checkCopyItem(item: CopyItem, category: CategoryId, report: (msg: string) => void): CodeLine[] {
  const maxLine = category === 'git' ? MAX_COMMAND_LINE : MAX_LINE;
  const lines = linesOf(item.text);
  const where = (i: number) => `문제 ${item.id} ${i + 1}번째 줄`;

  if (lines[0] === '' || lines.at(-1) === '') report(`문제 ${item.id}: 앞뒤에 빈 줄이 있다`);
  if (item.prompt !== undefined) {
    if (lines.length > 1) report(`문제 ${item.id}: prompt 는 한 줄 답에만`);
    const bad = [...item.prompt].find((ch) => ch < ' ' || ch > '~');
    if (bad) report(`문제 ${item.id}: prompt 에 ASCII 밖 글자 ${charLabel(bad)}`);
  }
  lines.forEach((line, i) => {
    if (line.includes('\t')) report(`${where(i)}: 탭은 쓰지 않는다 (공백으로)`);
    else {
      const bad = [...line].find((ch) => ch < ' ' || ch > '~');
      if (bad) report(`${where(i)}: ASCII 밖 글자 ${charLabel(bad)} — 따라치기 글은 영문·숫자·기호만`);
    }
    if (/ $/.test(line)) report(`${where(i)}: 줄 끝 공백`);
    if (line.length > maxLine) report(`${where(i)}: ${line.length}자 — ${maxLine}자 이하로`);
  });

  for (const [name, code] of Object.entries(item.hidden ?? {})) {
    const bad = [...(code ?? '')].find((ch) => ch !== '\n' && (ch < ' ' || ch > '~'));
    if (bad) report(`문제 ${item.id} hidden.${name}: ASCII 밖 글자 ${charLabel(bad)}`);
  }

  if (item.output !== undefined) {
    linesOf(item.output).forEach((line, i) => {
      const at = `문제 ${item.id} output ${i + 1}번째 줄`;
      if (line.includes('\t')) report(`${at}: 탭은 쓰지 않는다 (공백으로)`);
      else {
        const bad = [...line].find((ch) => (ch < ' ' || ch > '~') && !OUTPUT_SYMBOLS.has(ch));
        if (bad) report(`${at}: ASCII 밖 글자 ${charLabel(bad)}`);
      }
      if (/ $/.test(line)) report(`${at}: 줄 끝 공백`);
      if (line.length > MAX_OUTPUT_LINE) report(`${at}: ${line.length}자 — ${MAX_OUTPUT_LINE}자 이하로`);
    });
  }

  const lineNotes = new Map<number, string>();
  const lineResults = new Map<number, string>();
  for (const { at, note, result } of item.notes ?? []) {
    const hits = lines.flatMap((line, i) => (line.includes(at) ? [i] : []));
    if (hits.length === 0) report(`문제 ${item.id} 해설 at "${at}": 맞는 줄이 없다`);
    else if (hits.length > 1)
      report(`문제 ${item.id} 해설 at "${at}": ${hits.length}줄에 맞는다 — 한 줄에만 있는 조각으로`);
    else if (lineNotes.has(hits[0]!)) report(`문제 ${item.id} 해설 at "${at}": 다른 해설과 같은 줄`);
    else {
      lineNotes.set(hits[0]!, note);
      if (result) lineResults.set(hits[0]!, result);
    }
  }

  const last = lines.length - 1;
  const itemOutput = item.output === undefined ? null : item.output.replace(/\n$/, '');
  return lines.map((text, i) => {
    const outputs = [lineResults.get(i), i === last ? itemOutput : null].filter((o): o is string => !!o);
    return {
      text,
      comments: [...(i === 0 && item.note ? [item.note] : []), ...(lineNotes.has(i) ? [lineNotes.get(i)!] : [])],
      output: outputs.length > 0 ? outputs.join('\n') : null,
      scene: i === last ? (item.scene ?? null) : null,
      graph: null,
      prompt: item.prompt ?? null,
      itemId: item.id,
    };
  });
}

function checkRecallItem(
  item: RecallItem,
  setId: string,
  category: CategoryId,
  report: (msg: string) => void,
): RecallLine {
  const defined = new Set(Object.keys(item.placeholder ?? {}));
  const used = new Set([item.prompt, ...item.answers].flatMap((t) => [...t.matchAll(PLACEHOLDER)].map((m) => m[1]!)));
  for (const name of used) {
    if (!defined.has(name)) report(`문제 ${item.id}: <${name}> 이 placeholder 에 정의되지 않았다`);
  }
  for (const name of defined) {
    if (!item.prompt.includes(`<${name}>`))
      report(`문제 ${item.id}: prompt 에 <${name}> 이 없다 — 무엇을 칠지 알 수 없다`);
  }
  for (const answer of item.answers) {
    const filled = answer.replace(PLACEHOLDER, (_, name: string) => item.placeholder?.[name] ?? name);
    const bad = [...filled].find((ch) => ch < ' ' || ch > '~');
    if (bad) report(`문제 ${item.id} 정답 "${answer}": ASCII 밖 글자 ${charLabel(bad)}`);
    if (category === 'git' && !/^(git|gh) /.test(answer))
      report(`문제 ${item.id} 정답 "${answer}": git · gh 로 시작해야 한다`);
  }

  const fill = (text: string) =>
    text.replace(PLACEHOLDER, (_, name: string) => item.placeholder?.[name] ?? `<${name}>`);
  const answers = item.answers.map(fill);
  const context = item.context ? { setup: item.context.setup.map(fill) } : null;
  if (context) checkContext(item.id, context.setup, answers, report);

  const prompt: RecallLine['prompt'] = [];
  let at = 0;
  for (const m of item.prompt.matchAll(PLACEHOLDER)) {
    if (m.index > at) prompt.push({ text: item.prompt.slice(at, m.index), value: false });
    prompt.push({ text: item.placeholder?.[m[1]!] ?? m[0], value: true });
    at = m.index + m[0].length;
  }
  if (at < item.prompt.length) prompt.push({ text: item.prompt.slice(at), value: false });

  return { key: srsKey(setId, item.id), setId, itemId: item.id, prompt, answers, context, note: item.note ?? null };
}

/**
 * context 가 있는 문제는 엔진으로 동의어를 판정한다. 그래서 준비 명령이 엔진에서 돌아야 하고,
 * 정답들이 엔진에서 모두 첫 정답과 같은 결과여야 한다 — 콘텐츠의 동의어가 맞는지 엔진이 검사하는 셈
 */
function checkContext(id: string, setup: readonly string[], answers: readonly string[], report: (msg: string) => void) {
  let state = initialRepo();
  for (const command of setup) {
    const r = execute(state, command);
    if (r.error) {
      report(`문제 ${id} context "${command}": 엔진에서 실패 — ${r.error.message}`);
      return;
    }
    state = r.state;
  }
  const [first, ...rest] = answers;
  const r = execute(state, first!);
  if (r.error) {
    report(
      `문제 ${id} 정답 "${first}": 엔진에서 실패 — ${r.error.message} (엔진이 모르는 명령이면 context 를 빼야 한다)`,
    );
    return;
  }
  for (const answer of rest) {
    const verdict = judge({ answers: [first!], context: { setup } }, answer);
    if (!verdict.correct) {
      const fail = execute(state, answer).error;
      report(
        fail
          ? `문제 ${id} 정답 "${answer}": 엔진에서 실패 — ${fail.message}`
          : `문제 ${id} 정답 "${answer}": 엔진에서 첫 정답과 결과가 다르다`,
      );
    }
  }
}

/** 이야기 속 커밋 메시지 앞에 넣어 둔 해시를 뗀다 — 복사(cherry-pick)는 맨 앞, 되돌림(revert)은 Revert " 다음 */
const withoutHash = (message: string) => message.replace(/^(Revert ")?[0-9a-f]{7} /, '$1');

/**
 * engine 세트: 따라치기 명령을 Git 엔진으로 차례로 돌려 커밋 그래프 단계를 쌓는다.
 * 숨은 명령(before)은 그 줄을 시작할 때, 그 줄의 명령은 끝낼 때 반영한다. 엔진에서 뺀 줄(skipEngine)은 그래프가 그대로다.
 * 엔진에서 실패하면 콘텐츠 오류 — 세트의 Git 흐름(명령 순서 · 숨은 커밋)이 맞는지 엔진이 검사하는 셈이다.
 */
function simulate(
  data: SetData,
  report: (msg: string) => void,
): { graph: SetGraph; lines: Map<string, LineGraph> } | null {
  let state = initialRepo();
  let layout = layoutTree(state);
  const steps: RepoState[] = [state];
  const lines = new Map<string, LineGraph>();
  const names: Record<string, string> = { c1: data.engine!.root };
  const advance = (next: RepoState, describe: (message: string | undefined, label: string) => string) => {
    for (const [id, c] of Object.entries(next.commits))
      if (!state.commits[id]) names[id] = describe(c.message, c.label);
    state = next;
    layout = layoutTree(state, layout);
    steps.push(state);
  };
  for (const item of data.items) {
    if (item.type !== 'copy') continue;
    for (const command of item.before ?? []) {
      const r = execute(state, command);
      if (r.error) {
        report(`문제 ${item.id} before "${command}": 엔진에서 실패 — ${r.error.message}`);
        return null;
      }
      advance(r.state, (message, label) => message ?? label);
    }
    const during = steps.length - 1;
    const caption = item.tree?.caption ?? null;
    // 대화형 답 줄(prompt)은 명령이 아니라 엔진에서 돌리지 않는다
    if (item.skipEngine || item.prompt !== undefined) {
      lines.set(item.id, { during, after: during, caption });
      continue;
    }
    // as 가 있으면 엔진에서는 그 명령(들)로 — 한 줄이 엔진에서 여러 일일 수 있다 (gh pr merge --squash --delete-branch)
    const commands = item.as === undefined ? [item.text] : Array.isArray(item.as) ? item.as : [item.as];
    let next = state;
    for (const command of commands) {
      const r = execute(next, command.trim());
      if (r.error) {
        report(`문제 ${item.id}: 엔진에서 실패 — ${r.error.message}`);
        return null;
      }
      next = r.state;
    }
    // hash 를 주면 "새 해시 + 메시지". 복사 · 되돌림 커밋은 원본 메시지에 들어 있던 해시를 떼고 붙인다
    advance(next, (message, label) =>
      item.hash ? `${item.hash} ${withoutHash(message ?? '')}`.trim() : (message ?? label),
    );
    lines.set(item.id, { during, after: steps.length - 1, caption });
  }
  return { graph: { steps, layout, names }, lines };
}

/**
 * 세트 YAML 과 해설 파일 목록으로 세트를 만들고 문제를 모은다. 파일 읽기와 분리한 순수 함수.
 * path 는 저장소 기준 (content/sets/<category>/<slug>.yaml, content/guides/<category>/<slug>.md)
 */
export function buildContent(setFiles: RawFile[], guidePaths: string[]): { sets: ContentSet[]; problems: Problem[] } {
  const problems: Problem[] = [];
  const sets: ContentSet[] = [];
  const guides = new Set(guidePaths);

  for (const file of [...setFiles].sort((a, b) => a.path.localeCompare(b.path))) {
    const report = (message: string, level: Problem['level'] = 'error') =>
      problems.push({ path: file.path, message, level });

    const m = /^content\/sets\/([^/]+)\/([^/]+)\.ya?ml$/.exec(file.path);
    if (!m) {
      report('세트 파일은 content/sets/<카테고리>/<슬러그>.yaml 에 둔다');
      continue;
    }
    const [, folder, slug] = m as unknown as [string, string, string];
    if (!(CATEGORY_IDS as readonly string[]).includes(folder)) report(`알 수 없는 카테고리 폴더 "${folder}"`);
    if (!SLUG.test(slug)) report(`슬러그 "${slug}": 영문 소문자·숫자·하이픈만`);
    if (RESERVED_SLUGS.has(slug)) report(`슬러그 "${slug}" 는 예약어 — 주소가 겹친다`);

    let raw: unknown;
    try {
      raw = parse(file.text);
    } catch (e) {
      report(`YAML 문법 오류: ${(e as Error).message.split('\n')[0]}`);
      continue;
    }
    const parsed = setSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) report(`${issue.path.join('.') || '(최상위)'}: ${issue.message}`);
      continue;
    }
    const data = parsed.data;

    if (data.category !== folder) report(`category: ${data.category} 인데 폴더는 ${folder}`);
    if (data.id !== `${folder}-${slug}`) report(`id 는 "${folder}-${slug}" 여야 한다 (지금 "${data.id}")`);
    if (!guides.has(`content/guides/${folder}/${slug}.md`))
      report(`해설 파일 content/guides/${folder}/${slug}.md 가 없다`);

    const itemIds = new Set<string>();
    const lines: CodeLine[] = [];
    const recalls: RecallLine[] = [];
    for (const item of data.items) {
      if (itemIds.has(item.id)) report(`문제 id "${item.id}" 가 겹친다`);
      itemIds.add(item.id);
      if (item.type === 'copy') {
        const engineFields = item.before || item.skipEngine !== undefined || item.tree || item.hash || item.as;
        if (!data.engine && engineFields)
          report(`문제 ${item.id}: tree · before · skipEngine · hash · as 는 engine 세트에서만 쓴다`);
        if (data.engine && item.tree && item.skipEngine)
          report(`문제 ${item.id}: tree 는 엔진에서 도는 줄에만 — skipEngine 과 함께 쓸 수 없다`);
        if (data.engine && item.as && item.skipEngine)
          report(`문제 ${item.id}: as 는 엔진에서 돌릴 명령 — skipEngine 과 함께 쓸 수 없다`);
        const itemLines = checkCopyItem(item, data.category, report);
        if (data.engine && itemLines.length > 1) report(`문제 ${item.id}: engine 세트의 명령은 한 줄씩`);
        lines.push(...itemLines);
      } else recalls.push(checkRecallItem(item, data.id, data.category, report));
    }
    let graph: SetGraph | null = null;
    if (data.engine) {
      const simulated = simulate(data, report);
      if (simulated) {
        graph = simulated.graph;
        for (const line of lines) line.graph = simulated.lines.get(line.itemId) ?? null;
      }
    }

    if (lines.length === 0) report('따라치기 문제(type: copy)가 하나도 없다');
    else {
      // 자동 들여쓰기(기본 켬)를 가정해 줄 앞 공백은 빼고, 줄마다 Enter 하나를 더한다
      const chars = lines.reduce((n, l) => n + l.text.trimStart().length + 1, 0);
      const minutes = chars / CPM;
      if (minutes < 2 || minutes > 4) {
        report(`예상 ${minutes.toFixed(1)}분 (${chars}타 ÷ 분당 ${CPM}타) — 한 세트는 2~4분 권장`, 'warning');
      }
    }

    sets.push({ ...data, slug, href: `/${folder}/${slug}`, file: file.path, lines, recalls, graph });
  }

  // 카테고리 안 order 중복
  const seen = new Map<string, string>();
  for (const set of sets) {
    const key = `${set.category}:${set.order}`;
    const first = seen.get(key);
    if (first) problems.push({ path: set.file, message: `order ${set.order} 이 ${first} 와 겹친다`, level: 'error' });
    else seen.set(key, set.file);
  }

  return { sets, problems };
}
