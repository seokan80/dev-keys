import { describe, expect, it } from 'vitest';
import { DEMO_LINES, demoGraph } from '../../../src/lib/home/demo';

describe('demoGraph', () => {
  it('명령마다 그래프 단계를 하나씩 쌓는다 — 0단계는 시작 상태', () => {
    const graph = demoGraph(
      'docs: add README',
      DEMO_LINES.map((l) => l.text),
    );
    expect(graph.steps).toHaveLength(DEMO_LINES.length + 1);
    expect(Object.keys(graph.steps[0]!.commits)).toEqual(['c1']);
    expect(graph.names.c1).toBe('docs: add README');
  });

  it('브랜치를 만들어 커밋하고 main 으로 돌아와 --no-ff 로 합친다 — 마지막에 머지 커밋', () => {
    const graph = demoGraph(
      'docs: add README',
      DEMO_LINES.map((l) => l.text),
    );
    const last = graph.steps.at(-1)!;
    expect(last.head).toEqual({ type: 'branch', name: 'main' });
    const merge = Object.values(last.commits).find((c) => c.parents.length === 2);
    expect(merge).toBeDefined();
    expect(graph.names[merge!.id]).toContain('feature/search');
    expect(Object.values(graph.names)).toContain('feat: add search box');
  });

  it('엔진이 거절하는 명령이면 멈추고 알린다', () => {
    expect(() => demoGraph('docs: add README', ['git switch nowhere'])).toThrow(/nowhere/);
  });
});
