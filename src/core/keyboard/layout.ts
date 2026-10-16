import type { Finger } from './fingers';

export type KeyDef = {
  /** KeyboardEvent.code */
  code: string;
  /** 표시 이름 (문자 키는 base 를 쓴다) */
  label?: string;
  /** Shift 없이 나오는 문자 */
  base?: string;
  /** Shift 와 함께 나오는 문자 */
  shift?: string;
  /** 보조 표기 (한국 키보드의 ₩ 등) */
  sub?: string;
  /** 키 폭 (보통 키 = 1) */
  width: number;
  finger: Finger;
};

const key = (code: string, base: string, shift: string, finger: Finger): KeyDef => ({
  code,
  base,
  shift,
  width: 1,
  finger,
});

const letter = (ch: string, finger: Finger): KeyDef => key(`Key${ch.toUpperCase()}`, ch, ch.toUpperCase(), finger);

/**
 * ANSI 기본 영역(숫자 줄 ~ 스페이스). 텐키리스·풀배열·노트북 모두 이 영역은 같다.
 * 숫자 6 은 기본 오른손 검지 — 설정으로 바꾸는 것은 strokesFor 의 sixFinger 옵션.
 */
export const LAYOUT: readonly (readonly KeyDef[])[] = [
  [
    key('Backquote', '`', '~', 'lp'),
    key('Digit1', '1', '!', 'lp'),
    key('Digit2', '2', '@', 'lr'),
    key('Digit3', '3', '#', 'lm'),
    key('Digit4', '4', '$', 'li'),
    key('Digit5', '5', '%', 'li'),
    key('Digit6', '6', '^', 'ri'),
    key('Digit7', '7', '&', 'ri'),
    key('Digit8', '8', '*', 'rm'),
    key('Digit9', '9', '(', 'rr'),
    key('Digit0', '0', ')', 'rp'),
    key('Minus', '-', '_', 'rp'),
    key('Equal', '=', '+', 'rp'),
    { code: 'Backspace', label: 'Backspace', width: 2, finger: 'rp' },
  ],
  [
    { code: 'Tab', label: 'Tab', base: '\t', width: 1.5, finger: 'lp' },
    letter('q', 'lp'),
    letter('w', 'lr'),
    letter('e', 'lm'),
    letter('r', 'li'),
    letter('t', 'li'),
    letter('y', 'ri'),
    letter('u', 'ri'),
    letter('i', 'rm'),
    letter('o', 'rr'),
    letter('p', 'rp'),
    key('BracketLeft', '[', '{', 'rp'),
    key('BracketRight', ']', '}', 'rp'),
    { ...key('Backslash', '\\', '|', 'rp'), sub: '₩', width: 1.5 },
  ],
  [
    { code: 'CapsLock', label: 'Caps', width: 1.75, finger: 'lp' },
    letter('a', 'lp'),
    letter('s', 'lr'),
    letter('d', 'lm'),
    letter('f', 'li'),
    letter('g', 'li'),
    letter('h', 'ri'),
    letter('j', 'ri'),
    letter('k', 'rm'),
    letter('l', 'rr'),
    key('Semicolon', ';', ':', 'rp'),
    key('Quote', "'", '"', 'rp'),
    { code: 'Enter', label: 'Enter', base: '\n', width: 2.25, finger: 'rp' },
  ],
  [
    { code: 'ShiftLeft', label: 'Shift', width: 2.25, finger: 'lp' },
    letter('z', 'lp'),
    letter('x', 'lr'),
    letter('c', 'lm'),
    letter('v', 'li'),
    letter('b', 'li'),
    letter('n', 'ri'),
    letter('m', 'ri'),
    key('Comma', ',', '<', 'rm'),
    key('Period', '.', '>', 'rr'),
    key('Slash', '/', '?', 'rp'),
    { code: 'ShiftRight', label: 'Shift', width: 2.75, finger: 'rp' },
  ],
  [{ code: 'Space', label: '', base: ' ', width: 6.25, finger: 'rt' }],
];
