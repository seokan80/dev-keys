import { describe, expect, it } from 'vitest';
import { getSets } from '../../../src/lib/content/load';
import { fileStateSchema } from '../../../src/schemas/set';
import { checkShellStory, runShellStory } from '../../../scripts/lib/shell-story';

const sets = getSets().filter((set) => set.category === 'shell');

describe('Shell 기초 콘텐츠와 실제 Bash 대조', () => {
  it('두 세트의 도전 문제는 따옴표를 보존하는 판정을 쓴다', () => {
    expect(sets.map((set) => set.slug)).toEqual(['paths', 'files']);
    expect(sets.every((set) => set.recalls.length >= 4 && set.recalls.every((q) => q.match === 'literal'))).toBe(true);
  });

  it.each(sets)('$title: 명령·출력·현재 경로·파일 트리가 실제 Bash와 같다', (set) => {
    expect(checkShellStory(set)).toEqual([]);
  });

  it('각 이야기는 새 파일 상태에서 시작하고 실행할 때마다 결과가 같다', () => {
    expect(runShellStory('files')).toEqual(runShellStory('files'));
  });

  it('잘못 적은 출력과 파일 상태를 검증기가 잡는다', () => {
    const set = sets[0]!;
    const first = set.lines[0]!;
    expect(
      checkShellStory({
        ...set,
        lines: [
          { ...first, output: 'wrong', fileState: { ...first.fileState!, cwd: 'project' } },
          ...set.lines.slice(1),
        ],
      }),
    ).toEqual(['shell-paths/step-1: 실제 출력과 다름', 'shell-paths/step-1: 실제 파일 트리·현재 경로와 다름']);
  });

  it.each([
    { cwd: '.', entries: ['../outside'] },
    { cwd: 'project', entries: [] },
    { cwd: '.', entries: ['project/app.js'] },
    { cwd: '.', entries: ['project/', 'project/'] },
  ])('파일 트리의 잘못된 경로·부모·현재 위치·중복을 막는다: %j', (state) => {
    expect(fileStateSchema.safeParse({ ...state, caption: '상태' }).success).toBe(false);
  });
});
