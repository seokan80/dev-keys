import { describe, expect, it } from 'vitest';
import { renderText } from '@core/git';
import type { RawFile } from '../../../src/lib/content/check';
import { loadContent } from '../../../src/lib/content/load';
import { buildMissions } from '../../../src/lib/content/missions';

const yaml = (over: Record<string, string> = {}) =>
  Object.entries({
    id: 'mission-hotfix',
    order: '1',
    title: '긴급 수정',
    description: '설명',
    level: '1',
    story: '할 일',
    timeLimitSec: '90',
    start: '[git commit]',
    solution: '[git switch -c hotfix, git commit]',
    ...over,
  })
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

const file = (text: string, path = 'content/missions/hotfix.yaml'): RawFile => ({ path, text });
const GUIDES = ['content/guides/missions/hotfix.md'];
const messages = (r: ReturnType<typeof buildMissions>) => r.problems.map((p) => p.message);

describe('buildMissions', () => {
  it('시작 상태와 목표 상태(권장 풀이 결과)를 만든다', () => {
    const r = buildMissions([file(yaml())], GUIDES);
    expect(messages(r)).toEqual([]);
    const m = r.missions[0]!;
    expect(m.href).toBe('/git/tree/hotfix');
    expect(renderText(m.startState)).toBe('C2 <- C1 (HEAD -> main)\nC1 <- -');
    expect(renderText(m.goalState)).toBe('C3 <- C2 (HEAD -> hotfix)\nC2 <- C1 (main)\nC1 <- -');
  });

  it('시작 명령 · 권장 풀이가 엔진에서 실패하면 오류', () => {
    expect(messages(buildMissions([file(yaml({ start: '[git switch nope]' }))], GUIDES))[0]).toMatch(
      /start 1번째 "git switch nope".*invalid reference/,
    );
    expect(messages(buildMissions([file(yaml({ solution: '[git commit, git merge nope]' }))], GUIDES))[0]).toMatch(
      /solution 2번째/,
    );
  });

  it('풀이가 아무것도 바꾸지 않으면 오류', () => {
    expect(messages(buildMissions([file(yaml({ solution: '[git branch]' }))], GUIDES))).toEqual([
      expect.stringMatching(/아무것도 바꾸지 않는다/),
    ]);
  });

  it('id · 해설 · 형식 · 순서 규칙', () => {
    expect(messages(buildMissions([file(yaml({ id: 'x' }))], GUIDES))[0]).toMatch(/mission-hotfix/);
    expect(messages(buildMissions([file(yaml())], []))[0]).toMatch(/해설/);
    expect(messages(buildMissions([file(yaml({ timeLimitSec: '5' }))], GUIDES))[0]).toMatch(/timeLimitSec/);
    expect(messages(buildMissions([file(yaml(), 'content/missions/a/b.yaml')], GUIDES))[0]).toMatch(
      /content\/missions/,
    );
    expect(messages(buildMissions([file('id: [x')], GUIDES))[0]).toMatch(/YAML/);
    const two = buildMissions(
      [file(yaml()), file(yaml({ id: 'mission-other' }), 'content/missions/other.yaml')],
      [...GUIDES, 'content/guides/missions/other.md'],
    );
    expect(messages(two)).toEqual([expect.stringMatching(/order 1/)]);
  });
});

describe('실제 미션의 목표 트리 (사람이 한 번 확인한 스냅샷)', () => {
  const { missions } = loadContent();
  it.each(missions.map((m) => [m.slug, m] as const))('%s', (_, m) => {
    expect({ start: renderText(m.startState), goal: renderText(m.goalState) }).toMatchSnapshot();
  });
});
