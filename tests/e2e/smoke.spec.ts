import { expect, test } from '@playwright/test';

test('메인 페이지가 뜬다', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/DevKeys/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('DevKeys');
});

test('없는 주소는 404 페이지를 보여 준다', async ({ page }) => {
  const res = await page.goto('/no-such-page');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('페이지를 찾을 수 없습니다');
});
