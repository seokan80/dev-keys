// 빌드 때(Node) content/ 를 읽는다. 페이지와 검증 스크립트가 같은 로더를 쓴다.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildContent, type ContentSet, type Problem } from './check';
import { parse } from 'yaml';
import { z } from 'zod';
import { buildCatalog, type CommandEntry } from '../commands/catalog';
import { evalSchema, type EvalCase } from '../commands/eval';
import { buildCurricula, type Curriculum } from './curriculum';
import { buildMissions, type ContentMission } from './missions';
import { orderedSets } from './next';

function listFiles(root: string, sub: string, ext: RegExp): string[] {
  const dir = join(root, 'content', sub);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((name) => ext.test(name))
    .map((name) => `content/${sub}/${name.split('\\').join('/')}`)
    .sort();
}

const read = (root: string, path: string) => ({ path, text: readFileSync(join(root, path), 'utf8') });

export function loadContent(root = process.cwd()) {
  const guides = listFiles(root, 'guides', /\.md$/);
  const sets = buildContent(
    listFiles(root, 'sets', /\.ya?ml$/).map((p) => read(root, p)),
    guides,
  );
  const missions = buildMissions(
    listFiles(root, 'missions', /\.ya?ml$/).map((p) => read(root, p)),
    guides,
  );
  const curricula = buildCurricula(
    listFiles(root, 'curriculum', /\.ya?ml$/).map((p) => read(root, p)),
    sets.sets,
  );
  // 명령 카탈로그(Git): 주소 조각이 겹치면 명령 페이지가 덮어써지니 막는다
  // 커리큘럼 순서(1부 → 5부)로 — 명령 페이지의 "연습하는 세트" 가 이 순서다
  const catalog = buildCatalog(orderedSets(sets.sets).filter((s) => s.category === 'git'));
  const seen = new Map<string, string>();
  const catalogProblems = catalog.flatMap((e) => {
    const other = seen.get(e.slug);
    seen.set(e.slug, e.key);
    return other
      ? [
          {
            path: 'src/lib/commands/catalog.ts',
            message: `명령 주소 "${e.slug}" 가 겹친다: ${other} · ${e.key}`,
            level: 'error' as const,
          },
        ]
      : [];
  });
  const evaluation = loadEval(root, new Set(catalog.map((e) => e.slug)));
  // 사람이 칠 법한 상황 문장(생성 · 검수)을 카탈로그에 합친다 — 평가 질문과 같은 문장은 막는다
  const extra = loadSituations(root, catalog, evaluation.cases);
  return {
    sets: sets.sets,
    missions: missions.missions,
    curricula: curricula.curricula,
    catalog,
    evalCases: evaluation.cases,
    problems: [
      ...sets.problems,
      ...missions.problems,
      ...curricula.problems,
      ...catalogProblems,
      ...evaluation.problems,
      ...extra.problems,
    ],
  };
}

const EVAL_PATH = 'content/commands/eval.yaml';

/** 명령 찾기 평가 세트: 형식 · 정답 명령이 카탈로그에 있는지 · 질문 중복 */
function loadEval(root: string, slugs: ReadonlySet<string>): { cases: EvalCase[]; problems: Problem[] } {
  if (!existsSync(join(root, EVAL_PATH))) return { cases: [], problems: [] };
  const report = (message: string): Problem => ({ path: EVAL_PATH, message, level: 'error' });
  let raw: unknown;
  try {
    raw = parse(readFileSync(join(root, EVAL_PATH), 'utf8'));
  } catch (e) {
    return { cases: [], problems: [report(`YAML 문법 오류: ${(e as Error).message.split('\n')[0]}`)] };
  }
  const parsed = evalSchema.safeParse(raw);
  if (!parsed.success) {
    return { cases: [], problems: parsed.error.issues.map((i) => report(`${i.path.join('.')}: ${i.message}`)) };
  }
  const problems: Problem[] = [];
  const seen = new Set<string>();
  for (const c of parsed.data) {
    if (seen.has(c.q)) problems.push(report(`질문이 두 번: "${c.q}"`));
    seen.add(c.q);
    for (const slug of c.expect)
      if (!slugs.has(slug)) problems.push(report(`"${c.q}" 의 정답 "${slug}" 가 명령 카탈로그에 없다`));
  }
  return { cases: parsed.data, problems };
}

const situationsSchema = z.record(z.string(), z.array(z.string().min(2).max(60)).min(1));
/** 비교용: 띄어쓰기 · 문장 부호 · 대소문자를 무시한다 */
const plain = (s: string) => s.toLowerCase().replace(/[\s.,!?~·—-]+/g, '');

/** 명령마다 상황 문장(content/commands/situations/*.yaml)을 읽어 카탈로그 항목에 더한다 */
export function loadSituations(
  root: string,
  catalog: CommandEntry[],
  cases: readonly EvalCase[],
): { problems: Problem[] } {
  const problems: Problem[] = [];
  const bySlug = new Map(catalog.map((e) => [e.slug, e]));
  const questions = new Set(cases.map((c) => plain(c.q)));
  const owner = new Map<string, string>();
  for (const path of listFiles(root, 'commands/situations', /\.ya?ml$/)) {
    const report = (message: string) => problems.push({ path, message, level: 'error' });
    let raw: unknown;
    try {
      raw = parse(readFileSync(join(root, path), 'utf8'));
    } catch (e) {
      report(`YAML 문법 오류: ${(e as Error).message.split('\n')[0]}`);
      continue;
    }
    const parsed = situationsSchema.safeParse(raw);
    if (!parsed.success) {
      for (const i of parsed.error.issues) report(`${i.path.join('.')}: ${i.message}`);
      continue;
    }
    for (const [slug, sentences] of Object.entries(parsed.data)) {
      const entry = bySlug.get(slug);
      if (!entry) {
        report(`명령 "${slug}" 가 카탈로그에 없다`);
        continue;
      }
      if (owner.has(slug)) report(`명령 "${slug}" 가 ${owner.get(slug)} 에도 있다 — 한 파일에만`);
      owner.set(slug, path);
      const seen = new Set(entry.situations.map(plain));
      for (const s of sentences) {
        if (questions.has(plain(s))) report(`"${slug}": "${s}" 는 평가 질문과 같다 — 평가 세트를 베끼지 않는다`);
        else if (seen.has(plain(s))) report(`"${slug}": "${s}" 가 두 번`);
        else entry.situations.push(s);
        seen.add(plain(s));
      }
    }
  }
  return { problems };
}

let cached: ContentSet[] | null = null;
let cachedCurricula: Curriculum[] | null = null;
let cachedMissions: ContentMission[] | null = null;

function errorsOf(problems: { path: string; message: string; level: string }[]) {
  const errors = problems.filter((p) => p.level === 'error');
  if (errors.length > 0) {
    throw new Error(`콘텐츠 오류 ${errors.length}건:\n${errors.map((p) => `${p.path}: ${p.message}`).join('\n')}`);
  }
}

/** 페이지용: 미션 (order 순). 오류가 있으면 빌드를 멈춘다 */
export function getMissions(): ContentMission[] {
  if (cachedMissions) return cachedMissions;
  const { missions, problems } = loadContent();
  errorsOf(problems);
  cachedMissions = missions;
  return missions;
}

/** 페이지용: 오류가 있으면 빌드를 멈춘다 (보통은 validate:content 가 먼저 막는다) */
export function getSets(): ContentSet[] {
  if (cached) return cached;
  const { sets, problems } = loadContent();
  errorsOf(problems);
  cached = orderedSets(sets);
  return cached;
}

/** 페이지용: 카테고리 목록을 부로 묶은 것 (content/curriculum/<카테고리>.yaml 이 없으면 null) */
export function getCurriculum(category: string): Curriculum | null {
  if (!cachedCurricula) {
    const { curricula, problems } = loadContent();
    errorsOf(problems);
    cachedCurricula = curricula;
  }
  return cachedCurricula.find((c) => c.category === category) ?? null;
}

let cachedCatalog: CommandEntry[] | null = null;

/** 페이지용: Git 명령 카탈로그 (예시가 많은 명령부터) */
export function getCatalog(): CommandEntry[] {
  if (!cachedCatalog) {
    const { catalog, problems } = loadContent();
    errorsOf(problems);
    cachedCatalog = catalog;
  }
  return cachedCatalog;
}
