import { describe, expect, it } from 'vitest';
import {
  FINGER_NAMES,
  LAYOUT,
  describeStrokes,
  fingerForKey,
  handOf,
  keyStroke,
  strokesFor,
  type KeyDef,
} from '@core/keyboard';

const PRINTABLE = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i));
const keyByCode = new Map<string, KeyDef>(LAYOUT.flat().map((k) => [k.code, k]));

describe('배열', () => {
  it('키 code 가 겹치지 않는다', () => {
    const codes = LAYOUT.flat().map((k) => k.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('모든 키에 담당 손가락이 있다', () => {
    for (const key of LAYOUT.flat()) expect(FINGER_NAMES[key.finger], key.code).toBeDefined();
  });

  it('한국 키보드의 \\ 키는 ₩ 도 함께 표기한다', () => {
    expect(keyByCode.get('Backslash')?.sub).toBe('₩');
  });
});

describe('strokesFor', () => {
  it('출력 가능한 ASCII 95자 전부 키와 손가락이 있다', () => {
    for (const ch of PRINTABLE) expect(strokesFor(ch), JSON.stringify(ch)).not.toBeNull();
  });

  it('각 문자는 그 문자를 내는 키를 가리키고, Shift 여부가 맞다', () => {
    for (const ch of PRINTABLE) {
      if (ch === ' ') continue;
      const s = strokesFor(ch)!;
      const key = keyByCode.get(s.key)!;
      if (s.shift) expect(key.shift, JSON.stringify(ch)).toBe(ch);
      else expect(key.base, JSON.stringify(ch)).toBe(ch);
    }
  });

  it('Shift 가 필요한 문자는 반대 손의 Shift 를 쓴다', () => {
    for (const ch of PRINTABLE) {
      const s = strokesFor(ch)!;
      if (!s.shift) continue;
      expect(handOf(s.shift.finger), JSON.stringify(ch)).not.toBe(handOf(s.finger));
      expect(s.shift.key).toBe(handOf(s.finger) === 'left' ? 'ShiftRight' : 'ShiftLeft');
    }
  });

  it('대표 문자', () => {
    expect(strokesFor('a')).toEqual({ key: 'KeyA', finger: 'lp' });
    expect(strokesFor('A')).toEqual({ key: 'KeyA', finger: 'lp', shift: { key: 'ShiftRight', finger: 'rp' } });
    expect(strokesFor('k')).toEqual({ key: 'KeyK', finger: 'rm' });
    expect(strokesFor('{')).toEqual({ key: 'BracketLeft', finger: 'rp', shift: { key: 'ShiftLeft', finger: 'lp' } });
    expect(strokesFor(':')?.key).toBe('Semicolon');
    expect(strokesFor('`')).toEqual({ key: 'Backquote', finger: 'lp' });
    expect(strokesFor('~')?.shift?.key).toBe('ShiftRight');
    expect(strokesFor('5')?.finger).toBe('li');
    expect(strokesFor('7')?.finger).toBe('ri');
  });

  it('공백·줄바꿈·탭', () => {
    expect(strokesFor(' ')).toEqual({ key: 'Space', finger: 'rt' });
    expect(strokesFor('\n')).toEqual({ key: 'Enter', finger: 'rp' });
    expect(strokesFor('\t')).toEqual({ key: 'Tab', finger: 'lp' });
  });

  it('숫자 6 은 기본 오른손 검지, 설정으로 왼손 검지', () => {
    expect(strokesFor('6')).toEqual({ key: 'Digit6', finger: 'ri' });
    expect(strokesFor('^')?.shift?.key).toBe('ShiftLeft');
    expect(strokesFor('6', { sixFinger: 'left' })).toEqual({ key: 'Digit6', finger: 'li' });
    expect(strokesFor('^', { sixFinger: 'left' })).toEqual({
      key: 'Digit6',
      finger: 'li',
      shift: { key: 'ShiftRight', finger: 'rp' },
    });
  });

  it('한글·ASCII 밖 문자·여러 글자는 null', () => {
    for (const ch of ['ㅎ', '한', 'é', '₩', '\u0000', '', 'ab']) expect(strokesFor(ch), ch).toBeNull();
  });
});

describe('fingerForKey', () => {
  it('키보드 그림의 손가락 색도 숫자 6 설정을 따른다', () => {
    const six = keyByCode.get('Digit6')!;
    expect(fingerForKey(six)).toBe('ri');
    expect(fingerForKey(six, { sixFinger: 'left' })).toBe('li');
    expect(fingerForKey(keyByCode.get('KeyA')!, { sixFinger: 'left' })).toBe('lp');
  });
});

describe('keyStroke', () => {
  it('키 code 로 손가락을 알려 준다', () => {
    expect(keyStroke('Backspace')).toEqual({ key: 'Backspace', finger: 'rp' });
    expect(keyStroke('NoSuchKey')).toBeNull();
  });
});

describe('describeStrokes', () => {
  it('손가락 이름으로 설명한다', () => {
    expect(describeStrokes(strokesFor('k')!)).toBe('오른손 중지');
    expect(describeStrokes(strokesFor('{')!)).toBe('오른손 새끼 + 왼손 새끼(Shift)');
    expect(describeStrokes(strokesFor('A')!)).toBe('왼손 새끼 + 오른손 새끼(Shift)');
    expect(describeStrokes(strokesFor(' ')!)).toBe('오른손 엄지');
  });
});
