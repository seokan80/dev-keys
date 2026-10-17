import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { getSets } from '../../src/lib/content/load';
import { hydrated, typeLines as typeSet } from './helpers';

const sets = getSets();
const [first, second] = sets;
const java = sets.find((s) => s.category === 'java')!;

const escapeHtml = (text: string) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

test('메인 → 카테고리 → 세트로 들어간다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Git/ }).first().click();
  await expect(page).toHaveURL('/git');
  await page.getByRole('link', { name: new RegExp(`^${first!.title}`) }).click();
  await expect(page).toHaveURL(first!.href);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(first!.title);
});

test('세트 글과 해설은 서버 HTML 에 들어 있다 (검색 노출)', async ({ request }) => {
  const html = await (await request.get(first!.href)).text();
  expect(html).toContain(escapeHtml(first!.lines[0]!.text));
  const guide = readFileSync(`content/guides/${first!.category}/${first!.slug}.md`, 'utf8');
  const heading = /^## (.+)$/m.exec(guide)![1]!;
  expect(html).toMatch(new RegExp(`<h2[^>]*>${heading}</h2>`));
  expect(html).not.toContain('noindex');
});

test('해설은 치는 줄 위에 주석으로 붙는다 (치지 않는다)', async ({ page }) => {
  await page.goto(java.href);
  await hydrated(page);
  await expect(page.getByTestId('current-comment')).toHaveText(`// ${java.lines[0]!.comments[0]}`);
});

test('Git 명령은 $ 뒤에 치고, Enter 를 누르면 그 명령의 출력이 나타난다', async ({ page }) => {
  const git = sets.find((s) => s.category === 'git')!;
  const upto = git.lines.findIndex((l) => l.output !== null);
  const output = git.lines[upto]!.output!;
  await page.goto(git.href);
  await hydrated(page);
  await expect(page.getByTestId('current-line')).toContainText('$');
  await expect(page.getByTestId('output')).toHaveCount(0);
  await typeSet(page, git.lines.slice(0, upto + 1));
  await expect(page.getByTestId('output').first()).toHaveText(output);
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

test('대화형 질문에 답하는 줄은 $ 대신 그 질문이 앞에 보인다 (git add -p 의 y · n)', async ({ page }) => {
  const review = sets.find((s) => s.lines.some((l) => l.prompt))!;
  const at = review.lines.findIndex((l) => l.prompt);
  await page.goto(review.href);
  await hydrated(page);
  await typeSet(page, review.lines.slice(0, at));
  const current = page.getByTestId('current-line');
  await expect(current).toContainText(review.lines[at]!.prompt!);
  await expect(current).not.toContainText('$');
  await page.keyboard.type(review.lines[at]!.text);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('current-line')).toContainText(review.lines[at + 1]!.prompt!);
  // 그래프 아래에는 답(y)이 아니라 질문을 띄운 명령이 보인다
  if (review.graph) await expect(page.getByTestId('graph-caption')).toContainText(`$ ${review.lines[at - 1]!.text}`);
});

test('한 줄에 다 들어가지 않는 긴 줄은 옆으로 밀리지 않고 다음 줄로 이어진다', async ({ page }) => {
  const set = sets.find((s) => s.lines.some((l) => l.text.length > 90))!;
  const at = set.lines.findIndex((l) => l.text.length > 90);
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto(set.href);
  await hydrated(page);
  await typeSet(page, set.lines.slice(0, at));
  const area = page.getByTestId('typing-area');
  await expect(page.getByTestId('current-line')).toContainText(set.lines[at]!.text.slice(-20));
  const overflow = await area.evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
