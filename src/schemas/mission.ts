import { z } from 'zod';

/** 트리 미션: 시작 상태(명령)에서 목표 상태(권장 풀이를 돌린 결과)를 만든다. 결과가 같으면 어떤 풀이든 정답 */
export const missionSchema = z
  .object({
    id: z.string().min(1),
    order: z.number().int().positive(),
    title: z.string().min(1),
    /** 목록 · 검색 설명 */
    description: z.string().min(1),
    level: z.number().int().min(1).max(3),
    /** 상황과 할 일 (한국어) */
    story: z.string().min(1),
    timeLimitSec: z.number().int().min(30).max(600),
    /** 시작 저장소(main, C1)에서 실행해 미션 시작 상태를 만드는 명령 */
    start: z.array(z.string().min(1)),
    /** 권장 풀이 — 목표 트리는 이 풀이를 엔진으로 돌려 만든다. 길이가 권장 명령 수 */
    solution: z.array(z.string().min(1)).min(1).max(12),
  })
  .strict();

export type MissionData = z.infer<typeof missionSchema>;
