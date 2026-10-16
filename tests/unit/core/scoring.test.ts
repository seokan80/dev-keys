import { describe, expect, it } from 'vitest';
import { MISSION, RECALL_POINTS, challengeScore, missionScore, typingAccuracy } from '@core/scoring';

describe('recall 문제 점수 (구현계획 5.4)', () => {
  it('정답 100, 힌트 뒤 정답 60, 오답 · 정답 보기 0', () => {
    expect(RECALL_POINTS).toEqual({ correct: 100, hint: 60, wrong: 0, revealed: 0 });
  });
});

describe('challengeScore — Σ 문제 점수 × (0.5 + 0.5 × 정확도)', () => {
  it('정확도 100% 면 문제 점수 합 그대로', () => {
    expect(challengeScore(['correct', 'hint', 'wrong'], 1)).toBe(160);
  });

  it('정확도 0% 면 절반', () => {
    expect(challengeScore(['correct', 'correct'], 0)).toBe(100);
  });

  it('반올림하고, 정확도는 0~1 로 자른다', () => {
    expect(challengeScore(['hint'], 0.333)).toBe(40);
    expect(challengeScore(['correct'], 1.5)).toBe(100);
    expect(challengeScore(['correct'], -1)).toBe(50);
    expect(challengeScore([], 1)).toBe(0);
  });
});

describe('typingAccuracy — 친 글자 중 지우지 않은 비율', () => {
  it('지운 글자가 없으면 1, 친 글자가 없으면 1', () => {
    expect(typingAccuracy(40, 0)).toBe(1);
    expect(typingAccuracy(0, 0)).toBe(1);
  });

  it('지운 만큼 낮아지고 0 아래로는 내려가지 않는다', () => {
    expect(typingAccuracy(40, 10)).toBe(0.75);
    expect(typingAccuracy(10, 20)).toBe(0);
  });
});

describe('missionScore — 성공 시 max(100, 1000 + 남은 초 × 10 − 권장 초과 명령 수 × 100)', () => {
  it('권장 수 안에서 빨리 풀수록 높다', () => {
    expect(missionScore({ solved: true, secondsLeft: 42.9, commands: 4, recommended: 4 })).toBe(1420);
    expect(missionScore({ solved: true, secondsLeft: 0, commands: 3, recommended: 4 })).toBe(1000);
  });

  it('권장 수를 넘긴 명령마다 감점, 아무리 깎여도 성공이면 최소 점수', () => {
    expect(missionScore({ solved: true, secondsLeft: 10, commands: 6, recommended: 4 })).toBe(900);
    expect(missionScore({ solved: true, secondsLeft: 0, commands: 30, recommended: 4 })).toBe(MISSION.min);
  });

  it('실패 · 시간 초과는 0', () => {
    expect(missionScore({ solved: false, secondsLeft: 30, commands: 2, recommended: 4 })).toBe(0);
    expect(missionScore({ solved: true, secondsLeft: -1, commands: 4, recommended: 4 })).toBe(0);
  });
});
