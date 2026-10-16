// 점수 상수 (구현계획 5.4). 2차 순위 서버도 이 파일을 그대로 쓴다.

/** 뜻 보고 치기 한 문제: 정답 · 힌트(첫 단어) 뒤 정답 · 오답 · 정답 보기 */
export const RECALL_POINTS = { correct: 100, hint: 60, wrong: 0, revealed: 0 } as const;

/** 트리 미션: 성공 시 max(min, base + 남은 초 × perSecondLeft − 권장 초과 명령 수 × perExtraCommand) */
export const MISSION = { base: 1000, perSecondLeft: 10, perExtraCommand: 100, min: 100 } as const;
