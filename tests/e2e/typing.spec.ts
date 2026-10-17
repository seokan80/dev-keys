import { expect, test, type Page } from '@playwright/test';
import { getSets } from '../../src/lib/content/load';
import { hydrated } from './helpers';

async function start(page: Page, text: string) {
  await page.goto('/playground');
  await page.getByLabel('따라칠 글').fill(text);
  await page.getByRole('button', { name: '시작' }).click();
  await expect(page.getByTestId('typing-area')).toBeVisible();
}

test('주소는 끝 슬래시 없이 바로 열린다 (리다이렉트 없음)', async ({ request }) => {
  const res = await request.get('/playground', { maxRedirects: 0 });
  expect(res.status()).toBe(200);
});

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

test.describe('바로 치기 · 글자 크기', () => {
  const set = getSets()[0]!;

  test('들어와서 누르지 않고 바로 치면 시작되고 시간이 간다', async ({ page }) => {
    await page.goto(set.href);
    await hydrated(page);
    const first = set.lines[0]!.text;
    await page.keyboard.type(first.slice(0, 3));
    await expect(page.getByTestId('current-line')).toContainText(first);
    await expect(page.getByTestId('next-key')).toContainText(first[3] === ' ' ? 'Space' : first[3]!);
    await expect(page.getByTestId('stats')).not.toContainText('0:00', { timeout: 3000 });
  });

  test('다른 곳을 눌러 포커스가 빠져도 키를 누르면 그 키부터 이어서 친다', async ({ page }) => {
    await page.goto(set.href);
    await hydrated(page);
    const first = set.lines[0]!.text;
    await page.keyboard.type(first.slice(0, 2));
    await page.getByLabel('키보드 보기').click(); // 체크박스로 포커스가 옮겨 간다
    await page.getByLabel('키보드 보기').click();
    await page.keyboard.type(first.slice(2, 4));
    await expect(page.getByTestId('next-key')).toContainText(first[4] === ' ' ? 'Space' : first[4]!);
    await expect(page.getByTestId('typo')).toHaveCount(0);
  });

  test('글자 크기를 바꾸면 타자 영역 글자가 바뀌고, 새로고침 뒤에도 남는다', async ({ page }) => {
    await page.goto(set.href);
    await hydrated(page);
    const area = page.getByTestId('typing-area');
    await expect(area).toHaveCSS('font-size', '18px');
    await page.getByLabel('글자 크기').selectOption('xl');
    await expect(area).toHaveCSS('font-size', '25px');
    await page.reload();
    await hydrated(page);
    await expect(page.getByTestId('typing-area')).toHaveCSS('font-size', '25px');
  });
});
