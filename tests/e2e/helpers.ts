import { expect, type Page } from '@playwright/test';

/**
 * 서버에서 그린 React 아일랜드가 모두 연결될 때까지 기다린다 (AGENTS.md 환경 참고).
 * 링크를 눌러 이동한 직후에는 새 페이지의 아일랜드가 아직 없어서 "연결 안 된 것 0개"가 바로 참이 된다.
 * 그래서 아일랜드가 먼저 나타났는지부터 확인한다.
 */
export async function hydrated(page: Page) {
  await expect(page.locator('astro-island').first()).toBeAttached();
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
}
