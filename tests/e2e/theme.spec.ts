import { expect, test } from '@playwright/test';

const bodyBackground = (page: import('@playwright/test').Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test('기본은 블랙, 버튼으로 화이트로 바꾸면 화면이 밝아지고, 새로고침 · 다른 페이지에서도 남는다', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).not.toHaveAttribute('data-theme', 'light');
  const dark = await bodyBackground(page);

  const toggle = page.getByTestId('theme-toggle');
  await expect(toggle).toHaveText(/화이트/);
  await toggle.click();
  await expect(html).toHaveAttribute('data-theme', 'light');
  await expect(toggle).toHaveText(/블랙/);
  expect(await bodyBackground(page)).not.toBe(dark);

  // 저장한 테마는 그리기 전에(<head> 에서) 적용된다
  await page.goto('/git');
  await expect(html).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'light');

  await page.getByTestId('theme-toggle').click();
  await expect(html).not.toHaveAttribute('data-theme', 'light');
  expect(await bodyBackground(page)).toBe(dark);
});
