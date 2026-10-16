// 콘텐츠 검증: 실패하면 빌드·배포를 막는다 (계획서 8장).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { checkContentFiles, type ContentFile } from './lib/content-check.ts';

const root = join(import.meta.dirname, '..');
const contentDir = join(root, 'content');

const files: ContentFile[] = existsSync(contentDir)
  ? readdirSync(contentDir, { recursive: true, encoding: 'utf8' })
      .filter((name) => /\.ya?ml$/.test(name))
      .sort()
      .map((name) => {
        const full = join(contentDir, name);
        return { path: relative(root, full), text: readFileSync(full, 'utf8') };
      })
  : [];

const problems = checkContentFiles(files);

if (problems.length > 0) {
  for (const p of problems) console.error(`✗ ${p.path}: ${p.message}`);
  console.error(`\n콘텐츠 검증 실패: ${problems.length}건`);
  process.exit(1);
}

console.log(`콘텐츠 검증 통과: YAML ${files.length}개`);
