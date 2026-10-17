import { expect, test } from '@playwright/test';
import { getCurriculum } from '../../src/lib/content/load';
import { DEMO_LINES } from '../../src/lib/home/demo';

test('메인 페이지가 뜬다', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/DevKeys/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Git, 읽지 말고 손으로.');
});

test('메인 첫 화면: 아무 키나 치면 데모가 시작되고, 줄을 끝낼 때마다 옆 커밋 그래프가 바뀐다', async ({ page }) => {
  await page.goto('/');
  const demo = page.getByTestId('hero-demo');
  await expect(demo).toBeVisible();
  const tree = demo.getByTestId('git-tree');
  await expect(tree.locator('[data-label="HEAD → main"]')).toBeVisible();
  await page.keyboard.type(DEMO_LINES[0].text);
  await page.keyboard.press('Enter');
  await expect(tree.locator('[data-label="HEAD → feature/search"]')).toBeVisible();
  for (const line of DEMO_LINES.slice(1)) {
    await page.keyboard.type(line.text);
    await page.keyboard.press('Enter');
  }
  await expect(page.getByTestId('demo-done')).toContainText('1부부터 시작');
  await expect(tree.locator('[data-commit]')).toHaveCount(3);
});

test('메인: 시즌 1 Git 지도에 부마다 세트가 있고, 시즌 2 · 3 예고가 있다', async ({ page }) => {
  const git = getCurriculum('git')!;
  await page.goto('/');
  const map = page.getByTestId('season-map');
  await expect(map.getByTestId('map-part')).toHaveCount(git.parts.length);
  await expect(map.getByTestId('map-set')).toHaveCount(git.parts.reduce((n, p) => n + p.sets.length, 0));
  await expect(map.getByTestId('map-set').first()).toHaveAttribute('href', git.parts[0]!.sets[0]!.href);
  await expect(page.getByTestId('season-2')).toContainText('터미널');
  await expect(page.getByTestId('season-3')).toContainText('Java');
  await expect(page.getByTestId('start')).toHaveAttribute('href', git.parts[0]!.sets[0]!.href);
});

test('없는 주소는 404 페이지를 보여 준다', async ({ page }) => {
  const res = await page.goto('/no-such-page');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('페이지를 찾을 수 없습니다');
});

test('Git 목록은 부로 묶인다: 맨 위 목차, 부마다 세트, 아직 없는 세트는 준비 중', async ({ page }) => {
  const git = getCurriculum('git')!;
  await page.goto('/git');
  const index = page.getByTestId('part-index').getByRole('listitem');
  await expect(index).toHaveCount(git.parts.length);
  await expect(index.first()).toContainText(`1부 ${git.parts[0]!.title}`);

  const parts = page.getByTestId('part');
  await expect(parts).toHaveCount(git.parts.length);
  for (const [i, part] of git.parts.entries()) {
    const section = parts.nth(i);
    await expect(section.getByRole('heading', { level: 2 })).toHaveText(`${part.no}부 ${part.title}`);
    await expect(section.getByTestId('set-card')).toHaveCount(part.sets.length);
    if (part.sets[0]) await expect(section.getByTestId('set-card').first()).toContainText(part.sets[0].title);
    await expect(section.getByTestId('planned').getByRole('listitem')).toHaveCount(part.planned.length);
  }

  // 목차를 누르면 그 부로 간다
  await index.nth(1).getByRole('link').click();
  await expect(page).toHaveURL(/#part-2$/);
});
