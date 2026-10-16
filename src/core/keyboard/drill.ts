import { FINGER_NAMES, type Finger } from './fingers';
import { LAYOUT } from './layout';
import { fingerForKey, type KeyboardOptions } from './strokes';

export type DrillLine = { text: string; comment: string | null };
export type DrillStage = { finger: Finger; lines: DrillLine[] };

/** 엄지는 스페이스로 단계 사이에서 저절로 연습하므로 따로 두지 않는다 */
const ORDER: Finger[] = ['lp', 'lr', 'lm', 'li', 'ri', 'rm', 'rr', 'rp'];
const HOME: Partial<Record<Finger, string>> = {
  lp: 'a',
  lr: 's',
  lm: 'd',
  li: 'f',
  ri: 'j',
  rm: 'k',
  rr: 'l',
  rp: ';',
};
/** 기본 자리 줄 → 윗줄 → 아랫줄 → 숫자 줄 */
const ROW_ORDER = [2, 1, 3, 0];
const MAX_LINE = 60;

const label = (ch: string) => (/^[a-z]$/.test(ch) ? ch.toUpperCase() : ch);

function wrap(tokens: string[]): string[] {
  const lines: string[] = [];
  let line = '';
  for (const token of tokens) {
    if (line && line.length + 1 + token.length > MAX_LINE) {
      lines.push(line);
      line = token;
    } else line = line ? `${line} ${token}` : token;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * 손가락 풀기: 손가락마다 맡은 키를 차례로.
 * 기본 자리 키를 사이에 두고 오가며(aqa) 자리를 익히고, 다음 줄에서 같은 키의 Shift 글자를 친다.
 */
export function fingerDrill(options: KeyboardOptions = {}): DrillStage[] {
  return ORDER.map((finger) => {
    const home = HOME[finger]!;
    const keys = ROW_ORDER.flatMap((row) =>
      LAYOUT[row]!.filter((k) => fingerForKey(k, options) === finger && k.base !== undefined && k.base.trim() !== ''),
    );
    const others = keys.map((k) => k.base!).filter((ch) => ch !== home);
    const shifted = keys.flatMap((k) => (k.shift ? [k.shift] : []));

    const baseLines = wrap([home.repeat(3), ...others.flatMap((ch) => [ch.repeat(3), `${home}${ch}${home}`])]);
    const shiftLines = wrap([...shifted.map((ch) => ch.repeat(3)), shifted.join('')]);

    return {
      finger,
      lines: [
        ...baseLines.map((text, i) => ({
          text,
          comment:
            i === 0 ? `${FINGER_NAMES[finger]} — 기본 자리 ${label(home)}에서 ${others.map(label).join(' · ')}` : null,
        })),
        ...shiftLines.map((text, i) => ({
          text,
          comment: i === 0 ? 'Shift 글자 — Shift 는 반대 손 새끼로 누른다' : null,
        })),
      ],
    };
  });
}
