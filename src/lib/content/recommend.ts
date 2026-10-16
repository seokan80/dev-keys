// 메인의 "이어하기" · "오늘의 추천". 콘텐츠(세트 순서)와 저장값으로 정하는 순수 함수.
import { isDue } from '../../core/srs';
import type { SaveV1 } from '../../core/storage';
import type { ContentSet } from './check';
import { challengeHref } from './next';

/** 추천에 필요한 세트 정보 (세트 순서대로) */
export type PlanSet = {
  id: string;
  title: string;
  href: string;
  /** 도전 모드 주소 (뜻 보고 치기 문제가 있는 세트만) */
  challengeHref: string | null;
  /** 이 세트 도전 문제의 오답 기록 키 */
  recallKeys: string[];
};

export type Recommendation =
  | { kind: 'review'; count: number; href: string; title: string }
  | { kind: 'next' | 'challenge'; href: string; title: string }
  | null;

/**
 * 오늘의 추천: 복습할 문제가 있으면 가장 오래 밀린 문제가 있는 세트의 도전 모드(같은 카테고리 복습이 함께 섞인다),
 * 없으면 따라치기를 끝내지 않은 첫 세트, 그다음은 도전하지 않은 첫 세트
 */
export function recommend(
  sets: readonly PlanSet[],
  save: Pick<SaveV1, 'bests' | 'srs'>,
  today: string,
): Recommendation {
  const owner = new Map(sets.flatMap((s) => s.recallKeys.map((k) => [k, s] as const)));
  const due = Object.entries(save.srs)
    .filter(([key, entry]) => owner.has(key) && isDue(entry, today))
    .sort(
      ([ka, a], [kb, b]) => a.due.localeCompare(b.due) || sets.indexOf(owner.get(ka)!) - sets.indexOf(owner.get(kb)!),
    );
  if (due.length > 0) {
    const set = owner.get(due[0]![0])!;
    return { kind: 'review', count: due.length, href: set.challengeHref!, title: set.title };
  }
  const next = sets.find((s) => !save.bests[`${s.id}:copy`]);
  if (next) return { kind: 'next', href: next.href, title: next.title };
  const challenge = sets.find((s) => s.challengeHref && !save.bests[`${s.id}:recall`]);
  if (challenge) return { kind: 'challenge', href: challenge.challengeHref!, title: challenge.title };
  return null;
}

/** 이어하기: 마지막에 한 세트 (지금은 없는 주소면 없음) */
export function resumeOf(
  sets: readonly PlanSet[],
  lastPlayed: SaveV1['lastPlayed'],
): { href: string; title: string; mode: 'copy' | 'recall' } | null {
  if (!lastPlayed) return null;
  for (const s of sets) {
    if (s.href === lastPlayed.path) return { href: s.href, title: s.title, mode: 'copy' };
    if (s.challengeHref === lastPlayed.path) return { href: s.challengeHref, title: s.title, mode: 'recall' };
  }
  return null;
}

/** 빌드 때 세트 목록을 추천용으로 줄인다 (페이지 props 를 작게) */
export function toPlanSets(sets: readonly ContentSet[]): PlanSet[] {
  return sets.map((s) => ({
    id: s.id,
    title: s.title,
    href: s.href,
    challengeHref: s.recalls.length > 0 ? challengeHref(s) : null,
    recallKeys: s.recalls.map((r) => r.key),
  }));
}
