// 해설(Markdown)만 Astro 콘텐츠 컬렉션으로 읽는다. 세트 YAML 은 src/lib/content 의 로더가 읽는다.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const guides = defineCollection({
  // id = "<category>/<slug>" — 세트 주소와 같다
  loader: glob({ pattern: '**/*.md', base: './content/guides' }),
  schema: z.object({}),
});

export const collections = { guides };
