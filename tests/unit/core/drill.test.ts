import { describe, expect, it } from 'vitest';
import { LAYOUT, fingerDrill, fingerForKey, strokesFor } from '@core/keyboard';

describe('fingerDrill', () => {
  const stages = fingerDrill();

  it('왼손 새끼부터 오른손 새끼까지 차례로 (엄지는 스페이스로 따로 연습하지 않는다)', () => {
    expect(stages.map((s) => s.finger)).toEqual(['lp', 'lr', 'lm', 'li', 'ri', 'rm', 'rr', 'rp']);
  });

  it('단계의 모든 글자는 그 손가락이 친다 (공백 제외)', () => {
    for (const stage of stages) {
      for (const line of stage.lines) {
        for (const ch of line.text.replaceAll(' ', '')) {
          expect(strokesFor(ch)?.finger, `${stage.finger} ${JSON.stringify(ch)}`).toBe(stage.finger);
        }
      }
    }
  });

  it('그 손가락이 맡은 문자 키는 Shift 글자까지 빠짐없이 나온다', () => {
    for (const stage of stages) {
      const text = stage.lines.map((l) => l.text).join(' ');
      const keys = LAYOUT.flat().filter(
        (k) => fingerForKey(k) === stage.finger && k.base !== undefined && k.base.trim() !== '',
      );
      for (const key of keys) {
        expect(text, `${stage.finger} ${key.code}`).toContain(key.base!);
        if (key.shift) expect(text, `${stage.finger} ${key.code} shift`).toContain(key.shift);
      }
    }
  });

  it('줄은 출력 가능한 ASCII, 60자 이하, 단계 첫 줄에 손가락 설명', () => {
    for (const stage of stages) {
      expect(stage.lines[0]!.comment).toMatch(/^(왼|오른)손 /);
      for (const line of stage.lines) {
        expect(line.text).toMatch(/^[\x20-\x7e]+$/);
        expect(line.text.length).toBeLessThanOrEqual(60);
      }
    }
  });

  it('기본 자리 키를 사이에 두고 오간다 (aqa)', () => {
    expect(stages[0]!.lines[0]!.text).toMatch(/^aaa qqq aqa /);
  });

  it('숫자 6 을 왼손 검지로 두면 6 은 왼손 검지 단계로 옮겨 간다', () => {
    const left = fingerDrill({ sixFinger: 'left' });
    const textOf = (f: string) =>
      left
        .find((s) => s.finger === f)!
        .lines.map((l) => l.text)
        .join(' ');
    expect(textOf('li')).toContain('6');
    expect(textOf('ri')).not.toContain('6');
    for (const ch of textOf('li').replaceAll(' ', '')) {
      expect(strokesFor(ch, { sixFinger: 'left' })?.finger).toBe('li');
    }
  });
});
