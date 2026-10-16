import { expect, test, type Page } from '@playwright/test';
import { getSets } from '../../src/lib/content/load';
import { challengeHref } from '../../src/lib/content/next';

const sets = getSets();
const basic = sets.find((s) => s.id === 'git-basic-commit')!;
const branch = sets.find((s) => s.id === 'git-branch-merge')!;
const promptText = (q: (typeof basic.recalls)[number]) => q.prompt.map((p) => p.text).join('');

async function open(page: Page, set: typeof basic) {
  await page.goto(challengeHref(set));
  await expect(page.getByLabel('답')).toBeVisible();
}

/** 답을 치고 Enter */
async function submit(page: Page, text: string) {
  await page.getByLabel('답').fill(text);
  await page.getByLabel('답').press('Enter');
}

test('뜻을 보고 치면 판정하고, 틀리면 정답을 따라 친 뒤 넘어가며, 끝나면 점수와 다시 볼 문제를 보여 준다', async ({
  page,
}) => {
  const qs = basic.recalls;
  await open(page, basic);
  await expect(page.getByTestId('challenge-status')).toContainText(`1 / ${qs.length}`);
  await expect(page.getByTestId('question')).toContainText(promptText(qs[0]!));

  // 1. 힌트를 보고 맞힘 (60점)
  await page.getByRole('button', { name: /힌트/ }).click();
  await expect(page.getByTestId('hint')).toContainText('git i');
  await submit(page, qs[0]!.answers[0]!);
  await expect(page.getByTestId('feedback')).toHaveAttribute('data-correct', 'true');
  await page.getByLabel('답').press('Enter');

  // 2. 따옴표 종류가 달라도 정답
  expect(qs[1]!.itemId).toBe('recall-config-name');
  await submit(page, "git config --global user.name 'Kim Dev'");
  await expect(page.getByTestId('feedback')).toHaveAttribute('data-correct', 'true');
  await page.getByLabel('답').press('Enter');

  // 3. 틀리면 정답을 보여 주고, 따라 쳐야 넘어간다
  await submit(page, 'git log');
  const feedback = page.getByTestId('feedback');
  await expect(feedback).toHaveAttribute('data-correct', 'false');
  await expect(page.getByTestId('answer')).toHaveText(qs[2]!.answers[0]!);
  await page.getByLabel('답').press('Enter');
  await expect(feedback).toContainText('그대로 쳐 보세요');
  await submit(page, qs[2]!.answers[0]!);
  await expect(page.getByTestId('challenge-status')).toContainText(`4 / ${qs.length}`);

  // 4. 정답 보기 (0점)
  await page.getByRole('button', { name: /정답 보기/ }).click();
  await submit(page, qs[3]!.answers[0]!);

  // 나머지는 정답. reset 은 목록에 없는 동의어(HEAD~)도 엔진으로 확인해 정답
  for (const q of qs.slice(4)) {
    const text = q.itemId === 'recall-reset-soft' ? 'git reset --soft HEAD~' : q.answers[0]!;
    await submit(page, text);
    await expect(page.getByTestId('feedback')).toHaveAttribute('data-correct', 'true');
    if (q.itemId === 'recall-reset-soft') await expect(page.getByTestId('feedback')).toContainText('엔진으로');
    await page.getByLabel('답').press('Enter');
  }

  const result = page.getByTestId('result');
  await expect(result).toBeVisible();
  // (힌트 60 + 100 + 0 + 0 + 100 × 나머지) × (0.5 + 0.5 × 정확도 100%)
  await expect(page.getByTestId('result-점수')).toHaveText(`${60 + 100 + 100 * (qs.length - 4)}점`);
  await expect(page.getByTestId('result-맞힘')).toHaveText(`${qs.length - 2} / ${qs.length}`);
  await expect(page.getByTestId('missed').getByRole('listitem')).toHaveCount(2);
  const challenges = sets.filter((s) => s.recalls.length > 0);
  const nextChallenge = challenges[challenges.indexOf(basic) + 1]!;
  await expect(page.getByTestId('next-set')).toHaveAttribute('href', challengeHref(nextChallenge));
});

test('틀린 문제는 다음 날 같은 카테고리의 다른 세트 도전에 다시 나온다', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-17T09:00:00') });
  await open(page, basic);
  await page.getByRole('button', { name: /정답 보기/ }).click();
  await submit(page, basic.recalls[0]!.answers[0]!);

  // 같은 날에는 아직 나오지 않는다
  await open(page, branch);
  await expect(page.getByTestId('review-badge')).toHaveCount(0);

  await page.clock.setSystemTime(new Date('2026-10-18T09:00:00'));
  await open(page, branch);
  await expect(page.getByTestId('challenge-status')).toContainText('복습 1문제');
  // 세트 길이는 그대로 (끝 문제 하나와 바꾼다)
  await expect(page.getByTestId('challenge-status')).toContainText(`1 / ${branch.recalls.length}`);
  await expect(page.getByTestId('review-badge')).toHaveText(`복습 · ${basic.title}`);
  await expect(page.getByTestId('question')).toContainText(promptText(basic.recalls[0]!));

  // 맞히면 다음 간격(3일 뒤)으로 — 다음 날 다시 열어도 나오지 않는다
  await submit(page, basic.recalls[0]!.answers[0]!);
  await expect(page.getByTestId('feedback')).toHaveAttribute('data-correct', 'true');
  await page.clock.setSystemTime(new Date('2026-10-19T09:00:00'));
  await open(page, branch);
  await expect(page.getByTestId('review-badge')).toHaveCount(0);
});

test('세트 · 카테고리 · 결과 화면에서 도전 모드로 갈 수 있다', async ({ page }) => {
  await page.goto('/git');
  await page.getByRole('link', { name: `도전 모드: ${basic.title}` }).click();
  await expect(page).toHaveURL(new RegExp(`${challengeHref(basic)}$`));
  await page.goto(basic.href);
  await expect(page.getByTestId('challenge-link')).toHaveAttribute('href', challengeHref(basic));
});
