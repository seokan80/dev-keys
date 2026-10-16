import { MISSION, RECALL_POINTS } from './constants';

export { MISSION, RECALL_POINTS } from './constants';

export type RecallOutcome = keyof typeof RECALL_POINTS;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** 도전 모드 세트 점수 = Σ 문제 점수 × (0.5 + 0.5 × 정확도) */
export function challengeScore(outcomes: readonly RecallOutcome[], accuracy: number): number {
  const sum = outcomes.reduce((n, o) => n + RECALL_POINTS[o], 0);
  return Math.round(sum * (0.5 + 0.5 * clamp01(accuracy)));
}

/** 도전 모드 정확도: 친 글자 중 지우지 않은 비율 (따라치기의 오타 대신) */
export function typingAccuracy(inserted: number, deleted: number): number {
  return inserted === 0 ? 1 : clamp01(1 - deleted / inserted);
}

/** 트리 미션 점수. 실패 · 시간 초과는 0 */
export function missionScore(r: { solved: boolean; secondsLeft: number; commands: number; recommended: number }) {
  if (!r.solved || r.secondsLeft < 0) return 0;
  const extra = Math.max(0, r.commands - r.recommended);
  return Math.max(
    MISSION.min,
    MISSION.base + Math.floor(r.secondsLeft) * MISSION.perSecondLeft - extra * MISSION.perExtraCommand,
  );
}
