// 빌드 때(Node) content/ 를 읽는다. 페이지와 검증 스크립트가 같은 로더를 쓴다.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildContent, type ContentSet } from './check';
import { buildCatalog, type CommandEntry } from '../commands/catalog';
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
  const catalog = buildCatalog(sets.sets.filter((s) => s.category === 'git'));
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
  return {
    sets: sets.sets,
    missions: missions.missions,
    curricula: curricula.curricula,
    catalog,
    problems: [...sets.problems, ...missions.problems, ...curricula.problems, ...catalogProblems],
  };
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
