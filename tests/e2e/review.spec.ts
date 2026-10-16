import { expect, test, type Page } from '@playwright/test';
import { getMissions, getSets } from '../../src/lib/content/load';
import { challengeHref } from '../../src/lib/content/next';
import { hydrated } from './helpers';

// 검수 모드는 개발 서버 · PR 미리보기 빌드에만 있다. 스위치가 없는 빌드(운영 · 로컬 기본 빌드)에서는 건너뛴다.
const sets = getSets();
const branch = sets.find((s) => s.lines.some((l) => l.tree))!;
const basic = sets.find((s) => s.id === 'git-basic-commit')!;
const mission = getMissions()[0]!;

async function reviewOn(page: Page) {
  const bar = page.getByTestId('review-bar');
  test.skip((await bar.count()) === 0, '검수 모드를 켤 수 없는 빌드');
  await bar.getByLabel('검수 모드').check();
}

test('기본은 꺼져 있어 ↓ 가 아무것도 하지 않는다', async ({ page }) => {
  await page.goto(basic.href);
  await hydrated(page);
  test.skip((await page.getByTestId('review-bar').count()) === 0, '검수 모드를 켤 수 없는 빌드');
  await page.getByTestId('typing-area').click();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('next-key')).toContainText(basic.lines[0]!.text[0]!);
});

test('따라치기: ↓ 로 줄을 채우고 Enter 로 그림까지 넘겨 끝까지 — 기록은 남기지 않는다', async ({ page }) => {
  await page.goto(branch.href);
  await hydrated(page);
  await reviewOn(page);
  await page.getByTestId('typing-area').click();
  for (const line of branch.lines) {
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    if (line.tree || line.scene) {
      await expect(page.getByTestId('scene')).toBeVisible();
      await page.keyboard.press('Enter');
    }
  }
  await expect(page.getByTestId('reviewed')).toBeVisible();
  await page.goto('/me');
  await expect(page.getByText('아직 기록이 없어요')).toBeVisible();
});

test('도전 모드: ↓ 로 정답을 채운다', async ({ page }) => {
  await page.goto(challengeHref(basic));
  await expect(page.getByLabel('답')).toBeVisible();
  await reviewOn(page);
  await page.getByLabel('답').press('ArrowDown');
  await expect(page.getByLabel('답')).toHaveValue(basic.recalls[0]!.answers[0]!);
  await page.getByLabel('답').press('Enter');
  await expect(page.getByTestId('feedback')).toHaveAttribute('data-correct', 'true');
});

test('트리 미션: 입력이 비었을 때 ↓ 로 권장 풀이를 차례로 넣어 끝낸다', async ({ page }) => {
  await page.goto(mission.href);
  const input = page.getByLabel('git 명령');
  await expect(input).toBeVisible();
  await reviewOn(page);
  for (const command of mission.solution) {
    await input.press('ArrowDown');
    await expect(input).toHaveValue(command);
    await input.press('Enter');
  }
  await expect(page.getByTestId('mission-solved')).toBeVisible();
});
