// 빌드 때(Node) content/ 를 읽는다. 페이지와 검증 스크립트가 같은 로더를 쓴다.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildContent, type ContentSet } from './check';
import { orderedSets } from './next';

function listFiles(root: string, sub: string, ext: RegExp): string[] {
  const dir = join(root, 'content', sub);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((name) => ext.test(name))
    .map((name) => `content/${sub}/${name.split('\\').join('/')}`)
    .sort();
}

export function loadContent(root = process.cwd()) {
  const setFiles = listFiles(root, 'sets', /\.ya?ml$/).map((path) => ({
    path,
    text: readFileSync(join(root, path), 'utf8'),
  }));
  return buildContent(setFiles, listFiles(root, 'guides', /\.md$/));
}

let cached: ContentSet[] | null = null;

/** 페이지용: 오류가 있으면 빌드를 멈춘다 (보통은 validate:content 가 먼저 막는다) */
export function getSets(): ContentSet[] {
  if (cached) return cached;
  const { sets, problems } = loadContent();
  const errors = problems.filter((p) => p.level === 'error');
  if (errors.length > 0) {
    throw new Error(`콘텐츠 오류 ${errors.length}건:\n${errors.map((p) => `${p.path}: ${p.message}`).join('\n')}`);
  }
  cached = orderedSets(sets);
  return cached;
}
