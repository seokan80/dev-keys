import { expect, it } from 'vitest';
import { getVimLessons } from '../../../src/lib/content/load';
import { vimCheckpoints } from '../../../src/core/vim';
import { realVim } from '../../../scripts/lib/vim-real';

for (const lesson of getVimLessons()) {
  it(`${lesson.title}: 모든 Normal 단계의 본문·커서·저장본·복사 버퍼·종료를 실제 Vim과 대조한다`, () => {
    const checkpoints = vimCheckpoints(lesson);
    let prefix = '';
    for (const [i, step] of lesson.steps.entries()) {
      prefix += step.keys;
      const goal = checkpoints[i]!.goal;
      // feedkeys는 입력 모드를 끝내므로 Insert 중간 단계는 순수 함수·브라우저에서 검증한다.
      if (goal.mode === 'insert') continue;
      expect(
        { lines: goal.lines, cursor: goal.cursor, saved: goal.saved, register: goal.register, closed: goal.closed },
        step.id,
      ).toEqual(realVim(lesson.initial, prefix));
    }
  });
}
