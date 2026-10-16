import { z } from 'zod';
import { CATEGORY_IDS } from './categories';

const slugLike = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, '영문 소문자·숫자·하이픈만');

/** 따라치기 문제. text 는 한 줄 이상 (코드 세트는 여러 줄 블록) */
export const copyItemSchema = z
  .object({
    id: slugLike,
    type: z.literal('copy'),
    text: z.string().min(1),
    /** 문제 설명 — 첫 줄 위에 주석처럼 보인다 */
    note: z.string().min(1).optional(),
    /** 줄별 해설 — 그 줄 위에 주석처럼 보인다. at 은 그 줄에만 있는 글자 조각 */
    notes: z.array(z.object({ at: z.string().min(1), note: z.string().min(1) }).strict()).optional(),
    /** 명령을 치고 Enter 를 누르면 그 아래에 보여 줄 출력 (터미널 화면) */
    output: z.string().min(1).optional(),
    /** 치지 않는 앞뒤 코드 — 컴파일 검증용 (M6) */
    hidden: z.object({ before: z.string().optional(), after: z.string().optional() }).strict().optional(),
  })
  .strict();

/** 뜻 보고 치기 문제 (M5) */
export const recallItemSchema = z
  .object({
    id: slugLike,
    type: z.literal('recall'),
    prompt: z.string().min(1),
    answers: z.array(z.string().min(1)).min(1),
    placeholder: z.record(z.string(), z.string()).optional(),
    context: z
      .object({ setup: z.array(z.string()) })
      .strict()
      .optional(),
    note: z.string().min(1).optional(),
  })
  .strict();

export const setSchema = z
  .object({
    id: z.string().min(1),
    category: z.enum(CATEGORY_IDS),
    /** 카테고리 안 순서 (다음 세트 추천) */
    order: z.number().int().positive(),
    title: z.string().min(1),
    /** 카테고리 목록·검색 설명 */
    description: z.string().min(1),
    level: z.number().int().min(1).max(3),
    items: z.array(z.discriminatedUnion('type', [copyItemSchema, recallItemSchema])).min(1),
  })
  .strict();

export type CopyItem = z.infer<typeof copyItemSchema>;
export type RecallItem = z.infer<typeof recallItemSchema>;
export type SetData = z.infer<typeof setSchema>;
