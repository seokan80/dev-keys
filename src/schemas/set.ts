import { z } from 'zod';
import { CATEGORY_IDS } from './categories';

const slugLike = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, '영문 소문자·숫자·하이픈만');

/** Git 세 칸: 작업 트리(고친 것) · 스테이징(커밋할 것) · 저장소(커밋) */
const zone = z.enum(['workdir', 'staged', 'repo']);
/** 칸 안의 표 한 장. "~" 로 시작하면 사라진 것(취소선) */
const chip = z.string().min(1).max(60);

/** 명령을 치고 Enter 를 누르면 보여 줄 그림 — 그 명령 뒤의 상태 */
export const sceneSchema = z
  .object({
    workdir: z.array(chip).default([]),
    staged: z.array(chip).default([]),
    repo: z.array(chip).default([]),
    /** 무엇이 어디로 옮겨 갔는지 */
    arrow: z
      .object({ from: zone, to: zone, label: z.string().min(1).max(20).optional() })
      .strict()
      .refine((a) => a.from !== a.to, '서로 다른 두 칸')
      .optional(),
    /** 두 칸을 비교 (diff) */
    compare: z
      .tuple([zone, zone])
      .refine(([a, b]) => a !== b, '서로 다른 두 칸')
      .optional(),
    caption: z.string().min(1).max(80),
  })
  .strict();

export type Scene = z.infer<typeof sceneSchema>;
export type SceneZone = z.infer<typeof zone>;

/** 따라치기 문제. text 는 한 줄 이상 (코드 세트는 여러 줄 블록) */
export const copyItemSchema = z
  .object({
    id: slugLike,
    type: z.literal('copy'),
    text: z.string().min(1),
    /** 문제 설명 — 첫 줄 위에 주석처럼 보인다 */
    note: z.string().min(1).optional(),
    /** 줄별 해설 — 그 줄 위에 주석처럼 보인다. at 은 그 줄에만 있는 글자 조각 */
    notes: z
      .array(
        z
          .object({
            at: z.string().min(1),
            note: z.string().min(1),
            /** 그 줄을 다 치면 아래에 보여 줄 결과 값 (예: paidCustomers -> [kim, park]) */
            result: z.string().min(1).max(100).optional(),
          })
          .strict(),
      )
      .optional(),
    /** 명령을 치고 Enter 를 누르면 그 아래에 보여 줄 출력 (터미널 화면) */
    output: z.string().min(1).optional(),
    /** Enter 를 치면 보여 줄 그림 (그림 보기를 켰을 때). 문제 마지막 줄에 붙는다 */
    scene: sceneSchema.optional(),
    /** (engine 세트) 이 명령 앞에 엔진에서 몰래 실행할 명령 — 이야기 속 "커밋한 뒤" 같은 것. 치지 않는다 */
    before: z.array(z.string().min(1)).optional(),
    /** (engine 세트) 트리와 상관없는 명령(stash · log …)은 엔진에서 뺀다 */
    skipEngine: z.boolean().optional(),
    /** (engine 세트) 이 줄을 끝냈을 때 옆 커밋 그래프 아래에 보일 설명 */
    tree: z
      .object({ caption: z.string().min(1).max(80) })
      .strict()
      .optional(),
    /** 대화형 질문에 답하는 줄 — $ 대신 이 질문을 앞에 보여 준다 (git add -p 의 y · n). 엔진에서는 돌리지 않는다 */
    prompt: z.string().min(1).max(80).optional(),
    /** (engine 세트) 엔진이 모르는 명령을 엔진에서는 이 명령(들)으로 돌린다 — worktree add -b X 는 git branch X */
    as: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]).optional(),
    /** (engine 세트) 이 명령이 만든 커밋에 그림에서 붙일 해시 (출력에 나온 해시와 맞추려고) */
    hash: z
      .string()
      .regex(/^[0-9a-f]{7}$/, '7자리 16진수')
      .optional(),
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
    /** 명령들을 Git 엔진으로 차례로 돌려 커밋 트리 그림을 만든다. root = 시작 커밋(C1)의 설명 */
    engine: z
      .object({ root: z.string().min(1).max(60) })
      .strict()
      .optional(),
    items: z.array(z.discriminatedUnion('type', [copyItemSchema, recallItemSchema])).min(1),
  })
  .strict();

export type CopyItem = z.infer<typeof copyItemSchema>;
export type RecallItem = z.infer<typeof recallItemSchema>;
export type SetData = z.infer<typeof setSchema>;
