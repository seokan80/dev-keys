import { describe, expect, it } from 'vitest';
import {
  BROKEN_KEY,
  DEFAULT_SAVE,
  STORAGE_KEY,
  bestKey,
  loadSave,
  memoryStore,
  parseSave,
  recordBest,
  saveSave,
  setLastPlayed,
  updateSettings,
  type SaveV1,
} from '@core/storage';

const AT = '2026-10-16T10:00:00.000Z';
const best = (cpm: number, accuracy = 0.95) => ({ cpm, accuracy, at: AT });

const v1: SaveV1 = {
  version: 1,
  bests: { 'git-basic-commit:copy': best(180) },
  srs: {},
  settings: { autoIndent: false, showKeyboard: true, sixFinger: 'left' },
  lastPlayed: { path: '/git/basic-commit', at: AT },
};

describe('parseSave', () => {
  it('저장값이 없으면 기본값', () => {
    expect(parseSave(null)).toEqual({ save: DEFAULT_SAVE, status: 'empty' });
  });

  it('v1 은 그대로 읽는다', () => {
    expect(parseSave(JSON.stringify(v1))).toEqual({ save: v1, status: 'ok' });
  });

  it('깨진 JSON·객체가 아닌 값·모르는 판은 손상으로 보고 기본값', () => {
    for (const raw of ['{', '42', 'null', '[]', JSON.stringify({ ...v1, version: 99 })]) {
      expect(parseSave(raw), raw).toEqual({ save: DEFAULT_SAVE, status: 'broken' });
    }
  });

  it('판 표시가 없는 옛 저장값(v0)은 v1 로 옮긴다', () => {
    const v0 = { bests: { 'git-basic-commit:copy': best(150) }, settings: { autoIndent: false } };
    const { save, status } = parseSave(JSON.stringify(v0));
    expect(status).toBe('migrated');
    expect(save.version).toBe(1);
    expect(save.bests).toEqual(v0.bests);
    expect(save.settings).toEqual({ ...DEFAULT_SAVE.settings, autoIndent: false });
  });

  it('일부 칸이 잘못돼도 그 칸만 기본값으로 바꾸고 나머지는 살린다', () => {
    const raw = JSON.stringify({ ...v1, settings: { autoIndent: 'yes' }, lastPlayed: 3 });
    const { save, status } = parseSave(raw);
    expect(status).toBe('ok');
    expect(save.bests).toEqual(v1.bests);
    expect(save.settings).toEqual(DEFAULT_SAVE.settings);
    expect(save.lastPlayed).toBeUndefined();
  });

  it('잘못된 기록 하나는 그 기록만 버린다', () => {
    const raw = JSON.stringify({ ...v1, bests: { ok: best(100), bad: { cpm: 'fast' } } });
    expect(parseSave(raw).save.bests).toEqual({ ok: best(100) });
  });
});

describe('loadSave / saveSave', () => {
  it('저장하고 다시 읽는다', () => {
    const kv = memoryStore();
    saveSave(kv, v1);
    expect(loadSave(kv)).toEqual(v1);
  });

  it('손상된 저장값은 따로 백업해 두고 기본값으로 시작한다', () => {
    const kv = memoryStore({ [STORAGE_KEY]: '{oops' });
    expect(loadSave(kv)).toEqual(DEFAULT_SAVE);
    expect(kv.getItem(BROKEN_KEY)).toBe('{oops');
  });

  it('저장소가 실패해도(사생활 보호 모드 등) 예외를 던지지 않는다', () => {
    const kv = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
    };
    expect(loadSave(kv)).toEqual(DEFAULT_SAVE);
    expect(() => saveSave(kv, v1)).not.toThrow();
  });
});

describe('recordBest', () => {
  const key = bestKey('git-basic-commit', 'copy');

  it('키는 세트 id 와 모드', () => {
    expect(key).toBe('git-basic-commit:copy');
  });

  it('처음 기록은 최고 기록이다', () => {
    const r = recordBest(DEFAULT_SAVE, key, best(120));
    expect(r).toMatchObject({ improved: true, previous: null });
    expect(r.save.bests[key]).toEqual(best(120));
  });

  it('타수가 더 높아야 바꾼다', () => {
    const save = recordBest(DEFAULT_SAVE, key, best(120)).save;
    const lower = recordBest(save, key, best(110));
    expect(lower).toMatchObject({ improved: false, previous: best(120) });
    expect(lower.save).toBe(save);
    const higher = recordBest(save, key, best(130, 0.9));
    expect(higher).toMatchObject({ improved: true, previous: best(120) });
    expect(higher.save.bests[key]).toEqual(best(130, 0.9));
  });
});

describe('설정 · 마지막 세트', () => {
  it('설정은 바꾼 칸만 덮는다', () => {
    const save = updateSettings(DEFAULT_SAVE, { showKeyboard: false });
    expect(save.settings).toEqual({ ...DEFAULT_SAVE.settings, showKeyboard: false });
  });

  it('마지막으로 한 세트를 기억한다', () => {
    expect(setLastPlayed(DEFAULT_SAVE, '/java/stream-basics', AT).lastPlayed).toEqual({
      path: '/java/stream-basics',
      at: AT,
    });
  });

  it('기본 설정: 들여쓰기 자동 · 키보드 보기 · 숫자 6 오른손', () => {
    expect(DEFAULT_SAVE.settings).toEqual({ autoIndent: true, showKeyboard: true, sixFinger: 'right' });
  });
});
