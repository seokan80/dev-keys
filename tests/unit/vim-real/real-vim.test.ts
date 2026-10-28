import { describe, expect, it } from 'vitest';
import { createVim, playVim } from '../../../src/core/vim';
import { realVim } from '../../../scripts/lib/vim-real';

const cases = [
  'jyyGpkk',
  'jddp',
  'jIX<Esc>u<C-r>',
  'h',
  '$jjk',
  'Ggg',
  'lljkl',
  'iXYZ<Esc>',
  'aX<Esc>',
  'AXYZ<Esc>u',
  'AXYZ<Esc>u<C-r>',
  'li<CR>X<Esc>',
  'li<CR><BS><Esc>',
  'x',
  'llrX',
  'lldd',
  'llddu',
  'xxu',
  'xxu<C-r>',
  'yy',
  'yyp',
  'yyP',
  'yypu',
  'yypu<C-r>',
  'jyyGp',
  'xp',
  'xpu',
  'xpu<C-r>',
  '/alpha<CR>',
  '/alpha<CR>nN',
  'A!<Esc>:w<CR>',
  ':q<CR>',
  'A!<Esc>:q<CR>',
  'A!<Esc>:q!<CR>',
  'A!<Esc>:wq<CR>',
];

describe('실제 Vim과 키 동작 대조', () => {
  it.each(cases)('%s', (keys) => {
    const lines = ['alpha alpha', '  bravo', 'hi'];
    const actual = realVim(lines, keys);
    const mine = playVim(createVim(lines), keys);
    if (!keys.endsWith(':q<CR>')) expect(mine.error).toBeNull();
    expect({
      lines: mine.lines,
      cursor: mine.cursor,
      saved: mine.saved,
      register: mine.register,
      closed: mine.closed,
    }).toEqual(actual);
  });
});

it.each(['ddp', 'ddP', 'ddpu', 'ddpu<C-r>', 'yyddp'])('빈 버퍼 경계 %s', (keys) => {
  const lines = ['alpha'];
  const actual = realVim(lines, keys);
  const mine = playVim(createVim(lines), keys);
  expect({
    lines: mine.lines,
    cursor: mine.cursor,
    saved: mine.saved,
    register: mine.register,
    closed: mine.closed,
  }).toEqual(actual);
});
