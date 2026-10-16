import { parse } from 'yaml';
import { CATEGORY_IDS, type CategoryId } from '../../schemas/categories';
import { setSchema, type CopyItem, type RecallItem, type SetData } from '../../schemas/set';

export type RawFile = { path: string; text: string };
export type Problem = { path: string; message: string; level: 'error' | 'warning' };

/** 따라칠 한 줄과 그 줄에 보여 줄 해설 */
export type CodeLine = { text: string; note: string | null; itemId: string };

export type ContentSet = SetData & {
  slug: string;
  href: string;
  /** 저장소 기준 파일 경로 */
  file: string;
  /** 기본 모드에서 따라칠 줄 (따라치기 문제를 순서대로 이어 붙인 것) */
  lines: CodeLine[];
};

const RESERVED_SLUGS = new Set(['challenge', 'tree', 'index']);
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_LINE = 80;
/** 예상 시간 계산 기준 (분당 타수) */
const CPM = 200;
const PLACEHOLDER = /<([a-z][a-z0-9_]*)>/g;

const charLabel = (ch: string) => (ch === '\t' ? '탭' : `"${ch}"(U+${ch.codePointAt(0)!.toString(16).toUpperCase()})`);

/** YAML 블록(|)이 붙이는 마지막 줄바꿈 하나는 떼어 낸다 */
const linesOf = (text: string) => text.replace(/\n$/, '').split('\n');

function checkCopyItem(item: CopyItem, report: (msg: string) => void): CodeLine[] {
  const lines = linesOf(item.text);
  const where = (i: number) => `문제 ${item.id} ${i + 1}번째 줄`;

  if (lines[0] === '' || lines.at(-1) === '') report(`문제 ${item.id}: 앞뒤에 빈 줄이 있다`);
  lines.forEach((line, i) => {
    if (line.includes('\t')) report(`${where(i)}: 탭은 쓰지 않는다 (공백으로)`);
    else {
      const bad = [...line].find((ch) => ch < ' ' || ch > '~');
      if (bad) report(`${where(i)}: ASCII 밖 글자 ${charLabel(bad)} — 따라치기 글은 영문·숫자·기호만`);
    }
    if (/ $/.test(line)) report(`${where(i)}: 줄 끝 공백`);
    if (line.length > MAX_LINE) report(`${where(i)}: ${line.length}자 — ${MAX_LINE}자 이하로`);
  });

  for (const [name, code] of Object.entries(item.hidden ?? {})) {
    const bad = [...(code ?? '')].find((ch) => ch !== '\n' && (ch < ' ' || ch > '~'));
    if (bad) report(`문제 ${item.id} hidden.${name}: ASCII 밖 글자 ${charLabel(bad)}`);
  }

  const lineNotes = new Map<number, string>();
  for (const { at, note } of item.notes ?? []) {
    const hits = lines.flatMap((line, i) => (line.includes(at) ? [i] : []));
    if (hits.length === 0) report(`문제 ${item.id} 해설 at "${at}": 맞는 줄이 없다`);
    else if (hits.length > 1)
      report(`문제 ${item.id} 해설 at "${at}": ${hits.length}줄에 맞는다 — 한 줄에만 있는 조각으로`);
    else if (lineNotes.has(hits[0]!)) report(`문제 ${item.id} 해설 at "${at}": 다른 해설과 같은 줄`);
    else lineNotes.set(hits[0]!, note);
  }

  return lines.map((text, i) => ({ text, note: lineNotes.get(i) ?? item.note ?? null, itemId: item.id }));
}

function checkRecallItem(item: RecallItem, category: CategoryId, report: (msg: string) => void) {
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
    if (category === 'git' && !answer.startsWith('git '))
      report(`문제 ${item.id} 정답 "${answer}": git 으로 시작해야 한다`);
  }
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
    for (const item of data.items) {
      if (itemIds.has(item.id)) report(`문제 id "${item.id}" 가 겹친다`);
      itemIds.add(item.id);
      if (item.type === 'copy') lines.push(...checkCopyItem(item, report));
      else checkRecallItem(item, data.category, report);
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

    sets.push({ ...data, slug, href: `/${folder}/${slug}`, file: file.path, lines });
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
