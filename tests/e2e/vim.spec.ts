import { expect, test, type Page } from '@playwright/test';
import { getVimLessons } from '../../src/lib/content/load';
import { vimKeys, vimCheckpoints } from '../../src/core/vim';
const lessons = getVimLessons();
async function keys(page: Page, notation: string) {
  for (const key of vimKeys(notation))
    await page.keyboard.press(
      { '<Esc>': 'Escape', '<CR>': 'Enter', '<BS>': 'Backspace', '<C-r>': 'Control+r', ' ': 'Space' }[key] ?? key,
    );
}

test('홈·Shell에서 Vim 4세트로 이동한다', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('season-vim').click();
  await expect(page.getByTestId('vim-card')).toHaveCount(4);
  await page.goto('/shell');
  await page.getByRole('link', { name: /다음: Vim/ }).click();
  await expect(page).toHaveURL('/vim');
});
for (const lesson of lessons)
  test(`${lesson.title}: 실제 키로 끝내고 완료 기록을 확인한다`, async ({ page }) => {
    await page.goto(lesson.href);
    const editor = page.getByRole('textbox', { name: 'Vim 편집기' });
    await editor.click();
    const checkpoints = vimCheckpoints(lesson);
    for (const [i, step] of lesson.steps.entries()) {
      if (lesson.slug === 'search-save' && step.id === 'save') {
        await keys(page, ':q<CR>');
        await expect(page.getByTestId('vim-error')).toContainText('E37');
        await expect(page.getByTestId('vim-mode')).toContainText('Normal');
      }
      await keys(page, step.keys);
      const goal = checkpoints[i]!.goal;
      await expect(page.getByTestId('vim-cursor')).toContainText(`${goal.cursor.row + 1}행 ${goal.cursor.col + 1}열`);
      await expect(page.getByTestId('vim-error')).toBeEmpty();
      if (i < lesson.steps.length - 1)
        await expect(page.getByTestId('vim-prompt')).toHaveText(lesson.steps[i + 1]!.prompt);
    }
    await expect(page.getByTestId('vim-result')).toContainText('연습 완료!');
    await page.getByRole('link', { name: 'Vim 목록', exact: true }).click();
    await expect(page.getByTestId('vim-card').filter({ hasText: lesson.title })).toContainText('완료 ✓');
    await page.goto('/me');
    await expect(page.getByTestId('vim-records')).toContainText(lesson.title);
  });

test('힌트·단계 다시·처음부터와 미지원 키 거절', async ({ page }) => {
  await page.goto('/vim/modes');
  const editor = page.getByRole('textbox', { name: 'Vim 편집기' });
  await page.getByRole('button', { name: '권장 키 보기' }).click();
  await expect(page.getByTestId('vim-hint')).toContainText('i');
  await editor.click();
  await keys(page, 'i');
  await expect(page.getByTestId('vim-mode')).toContainText('Insert');
  await keys(page, 'oops');
  await page.getByRole('button', { name: '이 단계 다시' }).click();
  await expect(page.getByTestId('vim-buffer')).not.toContainText('oops');
  await expect(editor).toBeFocused();
  await keys(page, '# <Esc>');
  await page.getByRole('button', { name: '처음부터', exact: true }).click();
  await expect(page.getByTestId('vim-progress')).toHaveText('1 / 10 단계');
  await keys(page, 'w');
  await expect(page.getByTestId('vim-error')).toContainText('지원하지 않는');
  await expect(page.getByTestId('vim-buffer')).not.toContainText('#');
});

test('목표 전 종료는 안내하고 단계 다시로 복구한다', async ({ page }) => {
  await page.goto('/vim/modes');
  await page.getByRole('textbox', { name: 'Vim 편집기' }).click();
  await keys(page, ':q<CR>');
  await expect(page.getByText('목표에 도달하기 전에 종료했어요.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: '이 단계 다시' }).click();
  await keys(page, 'i');
  await expect(page.getByTestId('vim-mode')).toContainText('Insert');
});

test('Ctrl+R은 편집기 안에서만 redo하고 Tab은 초점을 옮긴다', async ({ page }) => {
  await page.goto('/vim/copy-undo');
  const editor = page.getByRole('textbox', { name: 'Vim 편집기' });
  await editor.click();
  await keys(page, 'yyjpu');
  await expect(page.getByTestId('vim-prompt')).toContainText('Ctrl+R');
  await keys(page, '<C-r>');
  await expect(page.getByTestId('vim-prompt')).toContainText('G로 마지막');
  await expect(page.getByTestId('vim-progress')).toHaveText('5 / 9 단계');
  await page.keyboard.press('Tab');
  await expect(editor).not.toBeFocused();
});

test('검수로 끝낸 Vim 기록은 저장하지 않는다', async ({ page }) => {
  await page.goto('/vim/modes');
  const bar = page.getByTestId('review-bar');
  await expect(page.getByRole('textbox', { name: 'Vim 편집기' })).toBeVisible();
  test.skip((await bar.count()) === 0, '검수 모드를 켤 수 없는 빌드');
  await bar.getByLabel('검수 모드').check();
  await page.getByRole('textbox', { name: 'Vim 편집기' }).click();
  for (let i = 0; i < lessons[0]!.steps.length; i++) {
    await page.keyboard.press('ArrowDown');
    await expect(page.getByTestId('vim-error')).toBeEmpty();
  }
  await expect(page.getByTestId('vim-result')).toContainText('검수 기록 제외');
  await page.goto('/me');
  await expect(page.getByTestId('vim-records')).toHaveCount(0);
});
