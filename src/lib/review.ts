// 검수 모드: 콘텐츠를 빨리 넘겨 보며 확인한다 (↓ 로 줄 · 정답 채우기). 기록은 남기지 않는다.
// 개발 서버와 PR 미리보기 빌드(CI 가 PUBLIC_REVIEW_MODE=1 로 빌드)에서만 켤 수 있다 — 운영 빌드에는 스위치가 없다.
import { useSyncExternalStore } from 'react';

export const REVIEW_AVAILABLE: boolean = import.meta.env.DEV || import.meta.env.PUBLIC_REVIEW_MODE === '1';

const KEY = 'devkeys:review';
const listeners = new Set<() => void>();

function read(): boolean {
  if (!REVIEW_AVAILABLE) return false;
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setReview(on: boolean) {
  try {
    window.localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    // 저장소를 못 쓰면 이번 화면에서만
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** 검수 모드가 켜져 있는가 (켤 수 없는 빌드면 늘 false) */
export function useReview(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}
