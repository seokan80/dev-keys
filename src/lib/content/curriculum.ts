import { parse } from 'yaml';
import { CATEGORY_IDS } from '../../schemas/categories';
import { curriculumSchema } from '../../schemas/curriculum';
import type { ContentSet, Problem, RawFile } from './check';

type SetRef = Pick<ContentSet, 'category' | 'slug' | 'order'>;

export type CurriculumPart<T extends SetRef = ContentSet> = {
  /** 1부부터 */
  no: number;
  title: string;
  description: string;
  sets: T[];
  /** 아직 만들지 않은 세트 제목 */
  planned: string[];
};

export type Curriculum<T extends SetRef = ContentSet> = { category: string; parts: CurriculumPart<T>[] };

/** 목록 YAML 과 세트로 부별 목록을 만들고 문제를 모은다 (파일 읽기와 분리한 순수 함수) */
export function buildCurricula<T extends SetRef>(
  files: RawFile[],
  sets: readonly T[],
): { curricula: Curriculum<T>[]; problems: Problem[] } {
  const problems: Problem[] = [];
  const curricula: Curriculum<T>[] = [];

  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    const report = (message: string) => problems.push({ path: file.path, message, level: 'error' });
    const category = /^content\/curriculum\/([^/]+)\.ya?ml$/.exec(file.path)?.[1];
    if (!category || !(CATEGORY_IDS as readonly string[]).includes(category)) {
      report(`목록 파일은 content/curriculum/<카테고리>.yaml — 카테고리는 ${CATEGORY_IDS.join(' · ')}`);
      continue;
    }
    let raw: unknown;
    try {
      raw = parse(file.text);
    } catch (e) {
      report(`YAML 문법 오류: ${(e as Error).message.split('\n')[0]}`);
      continue;
    }
    const parsed = curriculumSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) report(`${issue.path.join('.') || '(최상위)'}: ${issue.message}`);
      continue;
    }

    const own = new Map(sets.filter((s) => s.category === category).map((s) => [s.slug, s]));
    const listed = new Set<string>();
    const parts = parsed.data.parts.map((part, i) => {
      if (part.sets.length === 0 && part.planned.length === 0)
        report(`${i + 1}부 "${part.title}": 세트도 준비 중 항목도 없다`);
      const found: T[] = [];
      for (const slug of part.sets) {
        const s = own.get(slug);
        if (!s) report(`${i + 1}부: ${category} 카테고리에 "${slug}" 세트가 없다`);
        else if (listed.has(slug)) report(`${i + 1}부: "${slug}" 세트를 두 번 넣었다`);
        else found.push(s);
        listed.add(slug);
      }
      return { no: i + 1, title: part.title, description: part.description, sets: found, planned: part.planned };
    });

    const missing = [...own.keys()].filter((slug) => !listed.has(slug));
    if (missing.length > 0) report(`목록에 없는 세트: ${missing.join(', ')} — 어느 부에 넣어야 화면에 보인다`);
    const orders = parts.flatMap((p) => p.sets.map((s) => s.order));
    if (orders.some((o, k) => k > 0 && o < orders[k - 1]!))
      report('목록 순서가 세트 order 와 다르다 — "다음 세트" 안내가 order 순서를 따르므로 맞춘다');

    curricula.push({ category, parts });
  }
  return { curricula, problems };
}
