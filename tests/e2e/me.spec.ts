import { expect, test, type Page } from '@playwright/test';
import { STORAGE_KEY, type SaveV1 } from '../../src/core/storage';
import { getSets } from '../../src/lib/content/load';
import { challengeHref } from '../../src/lib/content/next';

const sets = getSets();
const [first, second] = sets;
const basic = sets.find((s) => s.id === 'git-basic-commit')!;
const AT = '2026-10-16T09:00:00.000Z';

/** 처음 열 때만 저장값을 넣는다 (초기화한 뒤 새로고침해도 덮어쓰지 않게) */
async function seed(page: Page, save: SaveV1) {
  await page.addInitScript(
    ([key, value]) => {
      if (!localStorage.getItem(key!)) localStorage.setItem(key!, value!);
    },
    [STORAGE_KEY, JSON.stringify(save)],
  );
}

const played: SaveV1 = {
  version: 1,
  bests: {
    [`${basic.id}:copy`]: { cpm: 200, accuracy: 0.95, at: AT },
    [`${basic.id}:recall`]: { cpm: 60, accuracy: 0.9, score: 900, at: AT },
  },
  srs: {
    [basic.recalls[1]!.key]: { step: 1, wrong: 2, due: '2026-10-20' },
    [basic.recalls[0]!.key]: { step: 0, wrong: 1, due: '2026-10-17' },
  },
  settings: { autoIndent: true, showKeyboard: true, sixFinger: 'right', showScenes: true, fontSize: 'md' },
  lastPlayed: { path: challengeHref(basic), at: AT },
};

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-17T09:00:00') });
});

test('처음 온 사람: 메인은 첫 세트를 추천하고, 내 기록은 비어 있다', async ({ page }) => {
  await page.goto('/');
  const pick = page.getByTestId('today-pick');
  await expect(pick).toContainText('처음 시작한다면');
  await expect(pick).toHaveAttribute('href', first!.href);
  await expect(page.getByTestId('resume')).toHaveCount(0);

  await page.getByRole('navigation', { name: '사이트' }).getByRole('link', { name: '내 기록' }).click();
  await expect(page.getByText('아직 기록이 없어요')).toBeVisible();
  await expect(page.getByText('복습할 문제가 없어요')).toBeVisible();
});

test('메인: 복습할 문제가 있으면 그 세트의 도전 모드를 추천하고, 마지막 세트를 이어서 할 수 있다', async ({ page }) => {
  await seed(page, played);
  await page.goto('/');
  const pick = page.getByTestId('today-pick');
  await expect(pick).toContainText('복습할 문제 1개');
  await expect(pick).toHaveAttribute('href', challengeHref(basic));
  const resume = page.getByTestId('resume');
  await expect(resume).toContainText('도전 모드');
  await expect(resume).toContainText(basic.title);
});

test('메인 Git 지도: 따라치기를 끝낸 세트에 체크와 최고 타수, 진도가 오른다', async ({ page }) => {
  await seed(page, { ...played, srs: {}, bests: { [`${basic.id}:copy`]: { cpm: 150, accuracy: 0.9, at: AT } } });
  await page.goto('/');
  const map = page.getByTestId('season-map');
  const done = map.locator(`[data-testid="map-set"][href="${basic.href}"]`);
  await expect(done).toHaveAttribute('data-done', 'true');
  await expect(done).toContainText('150타');
  await expect(map.getByTestId('map-progress')).toContainText('1개');
});

test('복습이 없으면 따라치기를 끝내지 않은 다음 세트를 추천한다', async ({ page }) => {
  await seed(page, { ...played, srs: {}, bests: { [`${first!.id}:copy`]: { cpm: 150, accuracy: 0.9, at: AT } } });
  await page.goto('/');
  await expect(page.getByTestId('today-pick')).toHaveAttribute('href', second!.href);
});

test('내 기록: 최고 기록 · 복습할 문제(예정일 순) · 설정, 초기화하면 기록만 지운다', async ({ page }) => {
  await seed(page, played);
  await page.goto('/me');

  const row = page.getByTestId('bests').getByRole('row', { name: new RegExp(basic.title) });
  await expect(row).toContainText('200타 · 95%');
  await expect(row).toContainText('900점');

  const wrongs = page.getByTestId('wrongs').getByRole('listitem');
  await expect(wrongs).toHaveCount(2);
  await expect(wrongs.first()).toContainText('오늘 복습');
  await expect(wrongs.first()).toContainText(basic.recalls[0]!.prompt.map((p) => p.text).join(''));
  await expect(wrongs.nth(1)).toContainText('10월 20일 복습 · 틀린 횟수 2');

  await page.getByLabel('키보드 보기').uncheck();

  await page.getByRole('button', { name: '기록 초기화' }).click();
  await page.getByRole('button', { name: '지우기' }).click();
  await expect(page.getByText('아직 기록이 없어요')).toBeVisible();
  await expect(page.getByText('복습할 문제가 없어요')).toBeVisible();

  await page.reload();
  await expect(page.getByText('아직 기록이 없어요')).toBeVisible();
  await expect(page.getByLabel('키보드 보기')).not.toBeChecked();
});
