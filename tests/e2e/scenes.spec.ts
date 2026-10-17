import { expect, test } from '@playwright/test';
import { getSets } from '../../src/lib/content/load';
import { hydrated, typeLines } from './helpers';

const sets = getSets();
const git = sets.find((s) => s.lines.some((l) => l.scene))!;
const firstScene = git.lines.findIndex((l) => l.scene);
const java = sets.find((s) => s.category === 'java')!;
const branching = sets.find((s) => s.graph && s.lines.some((l) => l.graph?.caption))!;

test('그림이 있는 세트는 옆 칸에 상태 그림이 늘 있고, 그림이 있는 줄을 끝내면 멈추지 않고 그 상태로 바뀐다', async ({
  page,
}) => {
  const line = git.lines[firstScene]!;
  await page.goto(git.href);
  await hydrated(page);
  const panel = page.getByTestId('side-panel');
  await expect(panel).toBeVisible();
  await expect(panel.getByTestId('scene')).toHaveCount(0); // 아직 그림이 있는 줄을 치지 않았다

  await typeLines(page, git.lines.slice(0, firstScene + 1));
  await expect(page.getByTestId('next-key')).toContainText(git.lines[firstScene + 1]!.text[0]!);
  await expect(panel.getByTestId('scene')).toBeVisible();
  await expect(page.getByTestId('graph-caption')).toContainText(`$ ${line.text}`);
  await expect(page.getByTestId('graph-caption')).toContainText(line.scene!.caption);

  // 다음 그림이 있는 줄까지 쳐도 그림은 계속 있고, 그 줄의 상태로 바뀐다
  const second = git.lines.findIndex((l, i) => i > firstScene && l.scene);
  await typeLines(page, git.lines.slice(firstScene + 1, second + 1));
  await expect(page.getByTestId('graph-caption')).toContainText(git.lines[second]!.scene!.caption);
  await expect(panel.getByTestId('scene')).toBeVisible();
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

test('그림 보기를 끄면 옆 칸을 숨긴다', async ({ page }) => {
  await page.goto(git.href);
  await hydrated(page);
  await expect(page.getByTestId('side-panel')).toBeVisible();
  await page.getByLabel('그림 보기').uncheck();
  await expect(page.getByTestId('side-panel')).toHaveCount(0);
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
