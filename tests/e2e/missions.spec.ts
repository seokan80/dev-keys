import { expect, test, type Page } from '@playwright/test';
import { getMissions } from '../../src/lib/content/load';

const missions = getMissions();
const bySlug = (slug: string) => missions.find((m) => m.slug === slug)!;

async function open(page: Page, slug: string) {
  await page.goto(bySlug(slug).href);
  await expect(page.getByLabel('git 명령')).toBeVisible();
}

async function enter(page: Page, commands: readonly string[]) {
  const input = page.getByLabel('git 명령');
  for (const [i, command] of commands.entries()) {
    await input.fill(command);
    await input.press('Enter');
    // 마지막 명령으로 풀리면 입력 칸이 성공 화면으로 바뀐다
    if (i < commands.length - 1) await expect(input).toHaveValue('');
  }
}

test('Git 카테고리에서 트리 미션 목록으로', async ({ page }) => {
  await page.goto('/git');
  await page.getByTestId('tree-missions-card').click();
  await expect(page).toHaveURL('/git/tree');
  for (const m of missions) await expect(page.getByRole('link', { name: new RegExp(m.title) })).toBeVisible();
});

test.describe('권장 풀이로 성공', () => {
  for (const m of missions) {
    test(m.title, async ({ page }) => {
      await open(page, m.slug);
      await enter(page, m.solution);
      await expect(page.getByTestId('mission-solved')).toContainText(`명령 ${m.solution.length}개`);
    });
  }
});

test.describe('다른 풀이로도 결과가 같으면 성공', () => {
  const alternatives: [string, string[]][] = [
    ['hotfix', ['git checkout -b hotfix', 'git commit -m "oops"', 'git checkout main', 'git merge hotfix']],
    ['hotfix', ['commit', 'branch hotfix']],
    ['rebase-feature', ['switch feature', 'reset --hard main', 'cherry-pick C2 C3', 'switch main', 'merge feature']],
    ['pick-fix', ['git cherry-pick experiment~1']],
  ];
  for (const [slug, commands] of alternatives) {
    test(`${slug}: ${commands.join(' / ')}`, async ({ page }) => {
      await open(page, slug);
      await enter(page, commands);
      await expect(page.getByTestId('mission-solved')).toBeVisible();
    });
  }
});

test('결과가 다르면 성공하지 않고, 힌트로 무엇이 다른지 알려 준다', async ({ page }) => {
  await open(page, 'rebase-feature');
  await enter(page, ['git merge feature']);
  await expect(page.getByTestId('mission-solved')).toHaveCount(0);
  await page.getByRole('button', { name: /힌트/ }).click();
  await expect(page.getByTestId('mission-diffs')).toContainText('main 가 가리키는 커밋이 목표와 다르다');
});

test('틀린 명령은 실제 git 문구와 한국어 설명으로 알려 주고 트리는 그대로', async ({ page }) => {
  await open(page, 'hotfix');
  await enter(page, ['git push origin main', 'git swich main']);
  const log = page.getByTestId('mission-log');
  await expect(log).toContainText('원격 저장소');
  await expect(log).toContainText("git: 'swich' is not a git command.");
  await expect(page.getByTestId('mission-status')).toContainText('명령 0');
});

test('↑ 로 이전 명령을 다시 부르고, 처음부터를 누르면 시작 상태로', async ({ page }) => {
  await open(page, 'hotfix');
  await enter(page, ['git switch -c hotfix']);
  const input = page.getByLabel('git 명령');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('git switch -c hotfix');
  await page.getByRole('button', { name: '처음부터' }).click();
  await expect(page.getByTestId('mission-status')).toContainText('명령 0');
  await expect(page.locator('[data-testid="git-tree"]').first().locator('[data-commit]')).toHaveCount(4);
});
