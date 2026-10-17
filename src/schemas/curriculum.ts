import { z } from 'zod';

/** 카테고리 목록을 부(part)로 묶는다: content/curriculum/<카테고리>.yaml. 부 번호는 적은 순서(1부부터) */
export const curriculumSchema = z
  .object({
    parts: z
      .array(
        z
          .object({
            /** "로컬" — 화면에는 "1부 로컬" */
            title: z.string().min(1),
            description: z.string().min(1),
            /** 이 부의 세트 슬러그 (세트 order 순서대로) */
            sets: z.array(z.string().min(1)).default([]),
            /** 아직 만들지 않은 세트 제목 — "준비 중"으로 보인다 */
            planned: z.array(z.string().min(1)).default([]),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export type CurriculumData = z.infer<typeof curriculumSchema>;
