import { parse } from 'yaml';
import { vimCheckpoints } from '../../core/vim';
import { vimLessonSchema, type VimLessonData } from '../../schemas/vim';
import type { Problem, RawFile } from './check';
export type VimLesson = VimLessonData & { slug: string; href: string };
export function buildVimLessons(files: RawFile[], guides: string[]): { lessons: VimLesson[]; problems: Problem[] } {
  const lessons: VimLesson[] = [];
  const problems: Problem[] = [];
  for (const file of files) {
    const report = (message: string) => problems.push({ path: file.path, message, level: 'error' });
    try {
      const data = vimLessonSchema.parse(parse(file.text));
      const slug = /^content\/sets\/vim\/([a-z0-9-]+)\.yaml$/.exec(file.path)?.[1];
      if (!slug || ['index', 'challenge', 'commands'].includes(slug)) {
        report('Vim 세트 경로·슬러그 오류');
        continue;
      }
      if (data.id !== `vim-${slug}`) report(`id는 vim-${slug}이어야 한다`);
      if (!guides.includes(`content/guides/vim/${slug}.md`)) report('Vim 해설이 없다');
      if (new Set(data.steps.map((s) => s.id)).size !== data.steps.length) report('단계 id가 겹친다');
      if (lessons.some((s) => s.order === data.order)) report('Vim 세트 순서가 겹친다');
      vimCheckpoints(data);
      lessons.push({ ...data, slug, href: `/vim/${slug}` });
    } catch (error) {
      report(String(error));
    }
  }
  lessons.sort((a, b) => a.order - b.order);
  return { lessons, problems };
}
