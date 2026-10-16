import { expect, test } from '@playwright/test';
import { getSets } from '../../src/lib/content/load';
import { hydrated, typeLines } from './helpers';

const sets = getSets();
const git = sets.find((s) => s.lines.some((l) => l.scene))!;
const firstScene = git.lines.findIndex((l) => l.scene);
const java = sets.find((s) => s.category === 'java')!;
const branching = sets.find((s) => s.graph && s.lines.some((l) => l.graph?.caption))!;

test('그림이 있는 명령은 Enter 뒤에 그림을 보여 주고, Enter 를 한 번 더 치면 넘어간다', async ({ page }) => {
  await page.goto(git.href);
  await hydrated(page);
  await typeLines(page, git.lines.slice(0, firstScene), { scenes: false });
  await page.keyboard.type(git.lines[firstScene]!.text);
  await page.keyboard.press('Enter');

  const scene = page.getByTestId('scene');
  await expect(scene).toContainText(git.lines[firstScene]!.scene!.caption);
  await expect(page.getByTestId('next-key')).toContainText('그림을 보고 계속');

  // 그림을 보는 동안 다른 키는 받지 않는다
  await page.keyboard.type('xyz');
  await expect(page.getByTestId('typo')).toHaveCount(0);
  await expect(scene).toBeVisible();

  await page.keyboard.press('Enter');
  await expect(scene).toHaveCount(0);
  await expect(page.getByTestId('next-key')).toContainText(git.lines[firstScene + 1]!.text[0]!);
});

test('브랜치 세트는 커밋 그래프를 늘 보여 주고, 줄을 끝낼 때마다 바꾼다 (멈추지 않는다)', async ({ page }) => {
  const graph = branching.graph!;
  // 머지 커밋을 만드는 줄
  const at = branching.lines.findIndex((l) => l.graph && graph.steps[l.graph.after]!.commits.c4);
  const line = branching.lines[at]!;
  await page.goto(branching.href);
  await hydrated(page);

  const live = page.getByTestId('live-graph');
  await expect(live).toBeVisible();
  await expect(live).toHaveAttribute('data-step', String(branching.lines[0]!.graph!.during));
  await expect(page.getByTestId('graph-caption')).toContainText('명령을 치면');

  await typeLines(page, branching.lines.slice(0, at + 1));
  // 멈추지 않고 다음 줄로 — 그래프는 머지 뒤 상태, 아래에 방금 친 명령과 설명
  await expect(page.getByTestId('scene')).toHaveCount(0);
  await expect(page.getByTestId('next-key')).toContainText(branching.lines[at + 1]!.text[0]!);
  await expect(page.getByTestId('graph-caption')).toContainText(`$ ${line.text}`);
  await expect(page.getByTestId('graph-caption')).toContainText(line.graph!.caption!);
  const tree = live.getByTestId('git-tree');
  await expect(tree).toContainText(graph.names.c4!);
  await expect(tree.locator('[data-label="HEAD → main"]')).toBeVisible();
  await expect(tree.locator('[data-commit]')).toHaveCount(4);
});

test('그림 보기를 끄면 커밋 그래프도 숨긴다', async ({ page }) => {
  await page.goto(branching.href);
  await hydrated(page);
  await expect(page.getByTestId('live-graph')).toBeVisible();
  await page.getByLabel('그림 보기').uncheck();
  await expect(page.getByTestId('live-graph')).toHaveCount(0);
});

test('그림 보기를 끄면 멈추지 않는다', async ({ page }) => {
  await page.goto(git.href);
  await hydrated(page);
  await page.getByLabel('그림 보기').uncheck();
  await typeLines(page, git.lines.slice(0, firstScene + 1), { scenes: false });
  await expect(page.getByTestId('scene')).toHaveCount(0);
  await expect(page.getByTestId('next-key')).toContainText(git.lines[firstScene + 1]!.text[0]!);
});

test('그림을 보면서 세트를 끝까지 치면 결과가 나온다', async ({ page }) => {
  await page.goto(git.href);
  await hydrated(page);
  await typeLines(page, git.lines);
  await expect(page.getByTestId('result')).toContainText('100%');
});

test('코드 세트는 문장을 다 치면 그 아래에 결과 값을 보여 준다', async ({ page }) => {
  const upto = java.lines.findIndex((l) => l.output);
  await page.goto(java.href);
  await hydrated(page);
  await expect(page.getByTestId('output')).toHaveCount(0);
  await typeLines(page, java.lines.slice(0, upto + 1));
  await expect(page.getByTestId('output').first()).toHaveText(`⇒ ${java.lines[upto]!.output}`);
});
