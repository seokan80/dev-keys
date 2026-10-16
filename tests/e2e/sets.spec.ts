import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { getSets } from '../../src/lib/content/load';

const sets = getSets();
const [first, second] = sets;
const java = sets.find((s) => s.category === 'java')!;

/** 서버에서 그린 React 아일랜드가 모두 연결될 때까지 (AGENTS.md 환경 참고) */
async function hydrated(page: Page) {
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
}

async function typeSet(page: Page, lines: readonly { text: string }[]) {
  await page.getByTestId('typing-area').click();
  for (const line of lines) {
    // 들여쓰기 자동 입력(기본 켬)이라 줄 앞 공백은 치지 않는다
    await page.keyboard.type(line.text.trimStart());
    await page.keyboard.press('Enter');
  }
}

test('메인 → 카테고리 → 세트로 들어간다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Git/ }).first().click();
  await expect(page).toHaveURL('/git');
  await page.getByRole('link', { name: new RegExp(first!.title) }).click();
  await expect(page).toHaveURL(first!.href);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(first!.title);
});

test('세트 글과 해설은 서버 HTML 에 들어 있다 (검색 노출)', async ({ request }) => {
  const html = await (await request.get(first!.href)).text();
  expect(html).toContain(first!.lines[0]!.text);
  const guide = readFileSync(`content/guides/${first!.category}/${first!.slug}.md`, 'utf8');
  const heading = /^## (.+)$/m.exec(guide)![1]!;
  expect(html).toMatch(new RegExp(`<h2[^>]*>${heading}</h2>`));
  expect(html).not.toContain('noindex');
});

test('치는 줄 아래에 그 줄의 해설을 보여 준다', async ({ page }) => {
  await page.goto(java.href);
  await hydrated(page);
  await expect(page.getByTestId('line-note')).toHaveText(java.lines[0]!.note!);
});

test('세트를 끝내면 결과 → 다음 세트, 새로고침 뒤에도 최고 기록이 남는다', async ({ page }) => {
  await page.goto(first!.href);
  await hydrated(page);
  await expect(page.getByTestId('best')).toHaveText('아직 기록이 없어요');

  await typeSet(page, first!.lines);
  const result = page.getByTestId('result');
  await expect(result).toContainText('새 최고 기록');
  await expect(result).toContainText('100%');

  await page.getByTestId('next-set').click();
  await expect(page).toHaveURL(second!.href);

  await page.goto(first!.href);
  await hydrated(page);
  await expect(page.getByTestId('best')).toContainText('최고 기록');
  await page.reload();
  await hydrated(page);
  await expect(page.getByTestId('best')).toContainText('최고 기록');
});

test('다시 하기를 누르면 처음부터 다시 친다', async ({ page }) => {
  await page.goto(first!.href);
  await hydrated(page);
  await typeSet(page, first!.lines);
  await page.getByRole('button', { name: '다시 하기' }).click();
  await expect(page.getByTestId('typing-area')).toBeVisible();
  await expect(page.getByTestId('next-key')).toContainText(first!.lines[0]!.text[0]!);
});

test('설정은 저장된다', async ({ page }) => {
  await page.goto(first!.href);
  await hydrated(page);
  await expect(page.locator('[data-key="KeyA"]')).toBeVisible();
  await page.getByLabel('키보드 보기').uncheck();
  await expect(page.locator('[data-key="KeyA"]')).toHaveCount(0);
  await page.reload();
  await hydrated(page);
  await expect(page.getByLabel('키보드 보기')).not.toBeChecked();
  await expect(page.locator('[data-key="KeyA"]')).toHaveCount(0);
});
