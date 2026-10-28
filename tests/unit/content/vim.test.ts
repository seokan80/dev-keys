import { expect, it } from 'vitest';
import { stringify } from 'yaml';
import { buildVimLessons } from '../../../src/lib/content/vim';
import { getVimLessons, getSets } from '../../../src/lib/content/load';
import { vimCheckpoints } from '../../../src/core/vim';
const valid = {
  id: 'vim-demo',
  category: 'vim',
  order: 1,
  title: '연습',
  description: '설명',
  initial: ['alpha'],
  steps: [{ id: 'edit', prompt: '고치세요', keys: 'x' }],
};
const build = (data: unknown, guides = ['content/guides/vim/demo.md']) =>
  buildVimLessons([{ path: 'content/sets/vim/demo.yaml', text: stringify(data) }], guides);
it('입문 4세트를 별도로 읽고 타자 따라치기 세트와 섞지 않는다', () => {
  expect(getVimLessons()).toHaveLength(4);
  expect(getSets().some((s) => s.category === 'vim')).toBe(false);
  expect(getVimLessons().map((l) => vimCheckpoints(l).at(-1)!.goal.lines)).toMatchSnapshot();
});
it('잘못된 본문·조합·무효 풀이·중복 단계·해설 누락을 검증한다', () => {
  expect(build(valid).problems).toEqual([]);
  expect(build({ ...valid, initial: ['한글'] }).problems.length).toBeGreaterThan(0);
  for (const keys of ['dw', 'g', '/alpha', 'h'])
    expect(build({ ...valid, steps: [{ ...valid.steps[0], keys }] }).problems.length).toBeGreaterThan(0);
  expect(build({ ...valid, steps: [...valid.steps, ...valid.steps] }).problems).toEqual(
    expect.arrayContaining([expect.objectContaining({ message: '단계 id가 겹친다' })]),
  );
  expect(build(valid, []).problems).toEqual(
    expect.arrayContaining([expect.objectContaining({ message: 'Vim 해설이 없다' })]),
  );
});
