import { expect, test } from '@playwright/test';
import { getCurriculum } from '../../src/lib/content/load';

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
