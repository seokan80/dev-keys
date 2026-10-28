import { expect, test } from '@playwright/test';
import { getSets } from '../../src/lib/content/load';
import { hydrated, typeLines } from './helpers';

const sets = getSets().filter((set) => set.category === 'shell');

test('시즌 2에서 Shell 목록과 준비 중 커리큘럼을 볼 수 있다', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('season-shell').click();
  await expect(page).toHaveURL('/shell');
  await expect(page.getByTestId('set-card')).toHaveCount(2);
  await expect(page.getByTestId('part')).toHaveCount(3);
  await expect(page.getByTestId('planned').getByRole('listitem')).toHaveCount(6);
});

for (const set of sets) {
  test(`${set.title}: 명령 뒤 파일 상태와 현재 경로가 바뀌고 끝까지 완료된다`, async ({ page }) => {
    await page.goto(set.href);
    await hydrated(page);
    const first = set.lines[0]!;
    await typeLines(page, [first]);
    await expect(page.getByTestId('shell-cwd')).toHaveText('현재: ~/workspace');
    await expect(page.getByTestId('file-tree')).toContainText('app.js');
    for (const line of set.lines.slice(1)) {
      await typeLines(page, [line]);
      const cwd = line.fileState!.cwd;
      await expect(page.getByTestId('shell-cwd')).toHaveText(`현재: ~/workspace${cwd === '.' ? '' : `/${cwd}`}`);
    }
    await expect(page.getByTestId('result')).toContainText('100%');
    await expect(page.getByRole('link', { name: '해설 읽기', exact: true })).toBeVisible();
    if (set.slug === 'files') {
      await expect(page.getByTestId('file-tree')).toContainText('app.saved.js');
      await expect(page.getByTestId('file-tree')).not.toContainText('worker.js');
    }
  });

  test(`${set.title}: 설명만 보고 정답을 치면 완료된다`, async ({ page }) => {
    await page.goto(`/shell/challenge/${set.slug}`);
    const input = page.getByLabel('답', { exact: true });
    await expect(input).toBeVisible();
    for (const question of set.recalls) {
      await input.fill(question.answers[0]!);
      await input.press('Enter');
      await expect(page.getByTestId('feedback')).toHaveAttribute('data-correct', 'true');
      await input.press('Enter');
    }
    await expect(page.getByTestId('result')).toContainText('완료!');
  });
}

test('파일 그림 보기 설정을 끄면 옆 칸을 숨긴다', async ({ page }) => {
  await page.goto('/shell/paths');
  await hydrated(page);
  await page.getByLabel('그림 보기').uncheck();
  await expect(page.getByTestId('side-panel')).toHaveCount(0);
});
