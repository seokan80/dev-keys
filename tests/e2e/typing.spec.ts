import { expect, test, type Page } from '@playwright/test';

async function start(page: Page, text: string) {
  await page.goto('/playground');
  await page.getByLabel('따라칠 글').fill(text);
  await page.getByRole('button', { name: '시작' }).click();
  await expect(page.getByTestId('typing-area')).toBeVisible();
}

test('연습장은 검색에서 빠진다', async ({ page }) => {
  await page.goto('/playground');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
});

test('임의 문장을 끝까지 따라치면 완료된다', async ({ page }) => {
  await start(page, 'git status\ngit add .');
  await page.keyboard.type('git status');
  await page.keyboard.press('Enter');
  await page.keyboard.type('git add .');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('finished')).toContainText('정확도 100%');
});

test('다음 키와 손가락을 알려 준다', async ({ page }) => {
  await start(page, 'gi A{');
  const next = page.getByTestId('next-key');
  await expect(next).toContainText('g');
  await expect(next).toContainText('왼손 검지');
  await expect(page.locator('[data-key="KeyG"]')).toHaveAttribute('data-active', 'true');

  await page.keyboard.type('gi');
  await expect(next).toContainText('Space');
  await expect(next).toContainText('오른손 엄지');

  await page.keyboard.type(' ');
  await expect(next).toContainText('왼손 새끼 + 오른손 새끼(Shift)');
  await expect(page.locator('[data-key="ShiftRight"]')).toHaveAttribute('data-active', 'true');

  await page.keyboard.type('A');
  await expect(next).toContainText('오른손 새끼 + 왼손 새끼(Shift)');

  await page.keyboard.type('{');
  await expect(next).toContainText('Enter');
});

test('틀리면 빨갛게 표시하고 Backspace 를 안내한다', async ({ page }) => {
  await start(page, 'abc');
  await page.keyboard.type('ax');
  await expect(page.getByTestId('typo')).toHaveText('x');
  await expect(page.getByTestId('next-key')).toContainText('Backspace');
  await page.keyboard.press('Backspace');
  await expect(page.getByTestId('typo')).toHaveCount(0);
  await page.keyboard.type('bc');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('finished')).toBeVisible();
});

test('한글 입력 상태면 안내한다', async ({ page }) => {
  await start(page, 'git');
  await page
    .getByLabel('따라치기 입력')
    .evaluate((el) => el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })));
  await expect(page.getByTestId('ime-notice')).toContainText('한/영');
  await page.keyboard.type('g');
  await expect(page.getByTestId('ime-notice')).toHaveCount(0);
});
