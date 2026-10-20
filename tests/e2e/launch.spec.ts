import { devices, expect, test } from '@playwright/test';
import { getSets } from '../../src/lib/content/load';
import { hydrated } from './helpers';

const sets = getSets();
const set = sets.find((s) => s.id === 'git-fetch-pull')!;

test('robots.txt 는 sitemap 을 알려 주고, sitemap 에는 세트 주소가 있고 검색에서 뺀 화면은 없다', async ({
  request,
}) => {
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toMatch(/^Sitemap: https?:\/\/.+\/sitemap\.xml$/m);
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain(`${set.href}</loc>`);
  expect(sitemap).toContain('/about</loc>');
  expect(sitemap).not.toContain('/challenge/');
  expect(sitemap).not.toContain('/me</loc>');
});

test('세트 페이지: 대표 주소 · 공유 카드 메타, 아래에 신고 링크(세트 id 를 미리 채운 GitHub 새 이슈)', async ({
  page,
}) => {
  await page.goto(set.href);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${set.href}$`));
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', new RegExp(set.title));
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\.png$/);
  const report = page.getByTestId('report-link');
  await expect(report).toHaveAttribute('href', /github\.com\/seokan80\/dev-keys\/issues\/new\?/);
  expect(decodeURIComponent((await report.getAttribute('href'))!.replaceAll('+', ' '))).toContain(set.id);
});

test('소개 · 개인정보 처리방침 페이지가 있고, 모든 페이지 아래에서 이어진다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('contentinfo').getByRole('link', { name: '소개' }).click();
  await expect(page).toHaveURL('/about');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('DevKeys');
  await page.getByRole('contentinfo').getByRole('link', { name: '개인정보 처리방침' }).click();
  await expect(page).toHaveURL('/privacy');
  await expect(page.getByRole('heading', { level: 2, name: /받는 개인정보/ })).toBeVisible();
});

test('컴퓨터에서는 휴대폰 안내가 없다', async ({ page }) => {
  await page.goto(set.href);
  await hydrated(page);
  await expect(page.getByTestId('typing-area')).toBeVisible();
  await expect(page.getByTestId('mobile-notice')).toHaveCount(0);
});

test.describe('터치 기기', () => {
  // 기기 흉내만 (브라우저 종류는 그대로 — describe 안에서는 바꿀 수 없다)
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices['Pixel 7'];
  test.use({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch });

  test('연습 화면에 "키보드가 있는 컴퓨터에서" 안내가 뜨고, 해설로 갈 수 있고, 닫을 수 있다', async ({ page }) => {
    await page.goto(set.href);
    const notice = page.getByTestId('mobile-notice');
    await expect(notice).toContainText('키보드가 있는 컴퓨터');
    await expect(notice.getByRole('link', { name: /해설/ })).toHaveAttribute('href', '#guide');
    await notice.getByRole('button', { name: '닫기' }).click();
    await expect(notice).toHaveCount(0);
  });
});

test.describe('명령 찾기', () => {
  test('하고 싶은 일을 한국어로 적으면 명령이 나오고, 명령 페이지에 상황 · 실제 출력 · 바로 쳐 볼 세트가 있다', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByTestId('nav-commands').click();
    await expect(page).toHaveURL('/git/commands');
    await page.getByTestId('command-search').fill('커밋 메시지를 고치고 싶어');
    const first = page.getByTestId('search-result').first();
    await expect(first).toContainText('git commit --amend');
    await expect(page).toHaveURL(/\?q=/);
    await first.click();
    await expect(page).toHaveURL(/\/git\/commands\/commit-amend/);
    await expect(page.getByTestId('situations')).toBeVisible();
    await expect(page.getByTestId('example').first()).toContainText('$ git commit --amend');
    await page
      .getByTestId('example')
      .first()
      .getByRole('link', { name: /바로 쳐 보기/ })
      .click();
    await expect(page).toHaveURL(/\/git\/[a-z-]+$/);
  });

  test('명령 조각으로도 찾고, 주소의 ?q= 로 바로 검색한다. 못 찾으면 알려 준다', async ({ page }) => {
    await page.goto('/git/commands?q=force-with-lease');
    await expect(page.getByTestId('search-result').first()).toContainText('--force-with-lease');
    await page.getByTestId('command-search').fill('쿠버네티스');
    await expect(page.getByTestId('no-result')).toBeVisible();
  });

  test('모든 명령 목록은 서버 HTML 에 있다 (검색 노출)', async ({ request }) => {
    const html = await (await request.get('/git/commands')).text();
    expect(html).toContain('/git/commands/commit-amend');
    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).toContain('/git/commands/switch-c</loc>');
  });
});
