import { expect, it } from 'vitest';
import { vimCheckpoints } from '../../../../src/core/vim';
it('풀이에서 단계별 시작과 목표를 만들며 저장 목표도 검증한다', () => {
  const plan = vimCheckpoints({
    initial: ['alpha'],
    steps: [
      { id: 'edit', keys: 'iX<Esc>' },
      { id: 'save', keys: ':w<CR>', checks: ['saved'] },
    ],
  });
  expect(plan[0]?.goal.lines).toEqual(['Xalpha']);
  expect(plan[1]?.goal.saved).toEqual(['Xalpha']);
});
it('상태를 바꾸지 않거나 지원하지 않는 풀이를 거절한다', () => {
  expect(() => vimCheckpoints({ initial: ['alpha'], steps: [{ id: 'noop', keys: 'h' }] })).toThrow(/목표/);
  expect(() => vimCheckpoints({ initial: ['alpha'], steps: [{ id: 'bad', keys: 'dw' }] })).toThrow();
});
