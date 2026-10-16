import { FINGER_NAMES, handOf, type Finger } from './fingers';
import { LAYOUT, type KeyDef } from './layout';

export type KeyStroke = { key: string; finger: Finger };
/** 한 글자를 치는 법: 누를 키 + (필요하면) 함께 누를 Shift */
export type Strokes = KeyStroke & { shift?: KeyStroke };

export type KeyboardOptions = {
  /** 숫자 6 을 칠 손가락 (기본: 오른손 검지) */
  sixFinger?: 'right' | 'left';
};

const keys = LAYOUT.flat();
const byCode = new Map<string, KeyDef>(keys.map((k) => [k.code, k]));
const byChar = new Map<string, { key: KeyDef; shifted: boolean }>();
for (const k of keys) {
  if (k.base !== undefined) byChar.set(k.base, { key: k, shifted: false });
  if (k.shift !== undefined) byChar.set(k.shift, { key: k, shifted: true });
}

/** 이 키를 칠 손가락 (숫자 6 설정 반영) */
export function fingerForKey(key: KeyDef, options: KeyboardOptions = {}): Finger {
  if (key.code === 'Digit6' && options.sixFinger === 'left') return 'li';
  return key.finger;
}

/** 키 code 로 담당 손가락 (Backspace 강조 등) */
export function keyStroke(code: string): KeyStroke | null {
  const key = byCode.get(code);
  return key ? { key: key.code, finger: key.finger } : null;
}

/** 문자 하나를 치는 법. 키보드로 칠 수 없는 문자(한글 등)는 null. */
export function strokesFor(char: string, options: KeyboardOptions = {}): Strokes | null {
  const hit = byChar.get(char);
  if (!hit) return null;

  const finger = fingerForKey(hit.key, options);
  if (!hit.shifted) return { key: hit.key.code, finger };

  // Shift 는 글자를 치는 손의 반대 손으로 누른다.
  const shift: KeyStroke =
    handOf(finger) === 'left' ? { key: 'ShiftRight', finger: 'rp' } : { key: 'ShiftLeft', finger: 'lp' };
  return { key: hit.key.code, finger, shift };
}

/** "오른손 약지 + 왼손 새끼(Shift)" */
export function describeStrokes(strokes: Strokes): string {
  const main = FINGER_NAMES[strokes.finger];
  return strokes.shift ? `${main} + ${FINGER_NAMES[strokes.shift.finger]}(Shift)` : main;
}
