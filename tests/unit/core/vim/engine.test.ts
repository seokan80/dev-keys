import { describe, expect, it } from 'vitest';
import { createVim, playVim, pressVim, matchesVim } from '../../../../src/core/vim';

const run = (keys: string, lines = ['alpha', 'bravo', 'hi']) => playVim(createVim(lines), keys);

describe('Vim 모드와 입력', () => {
  it('입력과 Esc는 본문·모드·커서를 바꾼다', () => {
    const insert = run('iXYZ');
    expect(insert).toMatchObject({ mode: 'insert', lines: ['XYZalpha', 'bravo', 'hi'], cursor: { row: 0, col: 3 } });
    expect(pressVim(insert, '<Esc>')).toMatchObject({ mode: 'normal', cursor: { row: 0, col: 2 } });
  });
  it('Enter로 나누고 Backspace로 다시 잇는다', () => {
    expect(run('li<CR><BS><Esc>').lines).toEqual(['alpha', 'bravo', 'hi']);
  });
  it('a · I · A의 삽입 위치', () => {
    expect(run('aX<Esc>').lines[0]).toBe('aXlpha');
    expect(run('A!<Esc>').lines[0]).toBe('alpha!');
    expect(run('IX<Esc>', ['  abc']).lines[0]).toBe('  Xabc');
  });
  it('지원하지 않는 키는 본문을 바꾸지 않고 설명한다', () => {
    const state = run('dw');
    expect(state.lines).toEqual(['alpha', 'bravo', 'hi']);
    expect(state.error).toBeTruthy();
  });
});

describe('이동과 편집', () => {
  it('짧은 줄을 거쳐도 세로 이동 열을 보존한다', () => {
    expect(run('$jjk').cursor).toEqual({ row: 1, col: 4 });
    expect(run('Ggg').cursor).toEqual({ row: 0, col: 0 });
  });
  it('x와 r은 글자 단위, dd는 줄 단위다', () => {
    expect(run('x').lines[0]).toBe('lpha');
    expect(run('llrX').lines[0]).toBe('alXha');
    expect(run('jdd').lines).toEqual(['alpha', 'hi']);
  });
  it('한 번의 입력 세션은 undo 하나이며 연속 x는 따로 되돌린다', () => {
    expect(run('iXYZ<Esc>u').lines[0]).toBe('alpha');
    expect(run('xxu').lines[0]).toBe('lpha');
    expect(run('iXYZ<Esc>u<C-r>').lines[0]).toBe('XYZalpha');
  });
  it('yy와 p · P는 실제로 복사한 줄을 삽입한다', () => {
    expect(run('jyyGp').lines).toEqual(['alpha', 'bravo', 'hi', 'bravo']);
    expect(run('yyP').lines).toEqual(['alpha', 'alpha', 'bravo', 'hi']);
  });
});

describe('검색·저장·종료', () => {
  it('검색은 현재 위치 다음부터 찾고 n · N이 반복한다', () => {
    const state = run('/alpha<CR>nN', ['alpha alpha', 'alpha']);
    expect(state.cursor).toEqual({ row: 0, col: 6 });
    expect(state.lastSearch).toBe('alpha');
  });
  it('못 찾거나 미지원 정규식이면 설명하고 본문을 보존한다', () => {
    expect(run('/missing<CR>').error).toBeTruthy();
    expect(run('/a.*<CR>').error).toBeTruthy();
  });
  it('수정한 파일은 q로 종료하지 못하고 wq로 저장·종료한다', () => {
    const changed = run('A!<Esc>:q<CR>');
    expect(changed.closed).toBe(false);
    expect(changed.error).toMatch(/E37/);
    const saved = playVim(changed, ':wq<CR>');
    expect(saved.closed).toBe(true);
    expect(saved.saved).toEqual(saved.lines);
    expect(pressVim(saved, 'x')).toBe(saved);
  });
  it('q!는 수정한 본문을 저장하지 않는다', () => {
    const state = run('A!<Esc>:q!<CR>');
    expect(state.closed).toBe(true);
    expect(state.saved[0]).toBe('alpha');
  });
  it('목표는 본문·커서·모드를 비교하고 필요할 때 저장본·레지스터도 본다', () => {
    const start = createVim(['alpha']);
    const copied = playVim(start, 'yy');
    expect(matchesVim(start, copied)).toBe(true);
    expect(matchesVim(start, copied, ['register'])).toBe(false);
  });
});
