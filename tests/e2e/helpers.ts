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

type TypedLine = { text: string };

/**
 * 따라치기 영역을 눌러 줄들을 친다. 들여쓰기 자동 입력(기본 켬)이라 줄 앞 공백은 치지 않는다.
 * 그림(상태 그림 · 커밋 그래프)은 옆 칸에 늘 보여 Enter 로 멈추지 않는다.
 */
export async function typeLines(page: Page, lines: readonly TypedLine[]) {
  await page.getByTestId('typing-area').click();
  for (const line of lines) {
    await page.keyboard.type(line.text.trimStart());
    await page.keyboard.press('Enter');
  }
}
