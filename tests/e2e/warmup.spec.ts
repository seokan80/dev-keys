import { expect, test } from '@playwright/test';
import { fingerDrill } from '../../src/core/keyboard';
import { getSets } from '../../src/lib/content/load';

test('메인에서 손가락 풀기로 들어가 왼손 새끼부터 차례로 치고, 다음은 첫 세트', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('warmup-card').click();
  await expect(page).toHaveURL('/warmup');
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);

  await expect(page.getByTestId('current-comment')).toContainText('# 왼손 새끼');
  await expect(page.getByTestId('next-key')).toContainText('왼손 새끼');

  await page.getByTestId('typing-area').click();
  // 회귀: 입력 칸에 포커스가 가도 치는 줄이 스크롤로 사라지지 않는다
  await expect(page.getByTestId('current-line')).toBeInViewport();
  for (const stage of fingerDrill()) {
    for (const line of stage.lines) {
      await page.keyboard.type(line.text);
      await page.keyboard.press('Enter');
    }
  }
  await expect(page.getByTestId('result')).toContainText('100%');
  await expect(page.getByTestId('next-set')).toContainText(getSets()[0]!.title);
});
