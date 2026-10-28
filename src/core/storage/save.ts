import { z } from 'zod';

/** 브라우저 저장소(localStorage)와 같은 모양. core 는 이 인터페이스만 받는다. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const STORAGE_KEY = 'devkeys:save';
/** 읽을 수 없던 저장값을 지우지 않고 남겨 두는 곳 */
export const BROKEN_KEY = 'devkeys:save:broken';

const bestSchema = z.object({
  cpm: z.number().nonnegative(),
  accuracy: z.number().min(0).max(1),
  /** 도전 모드 · 미션 점수 */
  score: z.number().nonnegative().optional(),
  at: z.string(),
});
const vimResultSchema = z.object({
  at: z.string().min(1),
  elapsedMs: z.number().int().nonnegative(),
  actions: z.number().int().positive(),
});
export type VimResult = z.infer<typeof vimResultSchema>;
const srsSchema = z.object({
  step: z.number().int(),
  wrong: z.number().int(),
  lastCorrect: z.string().optional(),
  due: z.string(),
});
const settingsSchema = z.object({
  autoIndent: z.boolean(),
  showKeyboard: z.boolean(),
  sixFinger: z.enum(['right', 'left']),
  /** 그림(상태 그림 · 커밋 그래프)을 타자 영역 옆에 보여 준다 */
  showScenes: z.boolean(),
  /** 타자 화면 글자 크기 */
  fontSize: z.enum(['sm', 'md', 'lg', 'xl']),
});

export type Best = z.infer<typeof bestSchema>;
export type SrsEntry = z.infer<typeof srsSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type SaveV1 = {
  version: 1;
  /** 키: `${setId}:${mode}` */
  bests: Record<string, Best>;
  /** 키: `${setId}/${itemId}` (M5) */
  srs: Record<string, SrsEntry>;
  settings: Settings;
  lastPlayed?: { path: string; at: string };
  vim?: Record<string, VimResult>;
};

export const DEFAULT_SETTINGS: Settings = {
  autoIndent: true,
  showKeyboard: true,
  sixFinger: 'right',
  showScenes: true,
  fontSize: 'md',
};
export const DEFAULT_SAVE: SaveV1 = { version: 1, bests: {}, srs: {}, settings: DEFAULT_SETTINGS };

/** 잘못된 항목 하나 때문에 전부 잃지 않도록, 항목마다 따로 검사한다 */
function validRecord<T>(value: unknown, schema: z.ZodType<T>): Record<string, T> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, T> = {};
  for (const [k, v] of Object.entries(value)) {
    const r = schema.safeParse(v);
    if (r.success) out[k] = r.data;
  }
  return out;
}

function toV1(raw: Record<string, unknown>): SaveV1 {
  const vim = validRecord(raw.vim, vimResultSchema);
  const settings = settingsSchema.partial().safeParse(raw.settings);
  const lastPlayed = z.object({ path: z.string(), at: z.string() }).safeParse(raw.lastPlayed);
  return {
    version: 1,
    ...(Object.keys(vim).length ? { vim } : {}),
    bests: validRecord(raw.bests, bestSchema),
    srs: validRecord(raw.srs, srsSchema),
    settings: { ...DEFAULT_SETTINGS, ...(settings.success ? settings.data : {}) },
    ...(lastPlayed.success ? { lastPlayed: lastPlayed.data } : {}),
  };
}

export type ParseStatus = 'empty' | 'ok' | 'migrated' | 'broken';

export function parseSave(raw: string | null): { save: SaveV1; status: ParseStatus } {
  if (raw === null) return { save: DEFAULT_SAVE, status: 'empty' };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { save: DEFAULT_SAVE, status: 'broken' };
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return { save: DEFAULT_SAVE, status: 'broken' };

  const obj = data as Record<string, unknown>;
  // v0: 판 표시가 생기기 전 모양. 알아볼 수 있는 칸만 옮긴다.
  if (obj.version === undefined) return { save: toV1(obj), status: 'migrated' };
  if (obj.version === 1) return { save: toV1(obj), status: 'ok' };
  return { save: DEFAULT_SAVE, status: 'broken' };
}

export function loadSave(kv: KeyValueStore): SaveV1 {
  let raw: string | null;
  try {
    raw = kv.getItem(STORAGE_KEY);
  } catch {
    return DEFAULT_SAVE;
  }
  const { save, status } = parseSave(raw);
  if (status === 'broken' && raw !== null) {
    try {
      kv.setItem(BROKEN_KEY, raw);
    } catch {
      // 백업도 못 하면 그대로 기본값으로 진행한다
    }
  }
  return save;
}

export function saveSave(kv: KeyValueStore, save: SaveV1): void {
  try {
    kv.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    // 저장소를 쓸 수 없으면(사생활 보호 모드·용량 초과) 이번 방문에서만 기억한다
  }
}

export const bestKey = (setId: string, mode: 'copy' | 'recall' | 'mission') => `${setId}:${mode}`;

/** 더 나을 때만 최고 기록을 바꾼다: 점수가 있으면(도전 모드) 점수, 없으면 타수 */
export function recordBest(
  save: SaveV1,
  key: string,
  result: Best,
): { save: SaveV1; improved: boolean; previous: Best | null } {
  const previous = save.bests[key] ?? null;
  const better =
    result.score !== undefined ? result.score > (previous?.score ?? -1) : result.cpm > (previous?.cpm ?? -1);
  if (previous && !better) return { save, improved: false, previous };
  return { save: { ...save, bests: { ...save.bests, [key]: result } }, improved: true, previous };
}

export function updateSettings(save: SaveV1, patch: Partial<Settings>): SaveV1 {
  return { ...save, settings: { ...save.settings, ...patch } };
}

export function setLastPlayed(save: SaveV1, path: string, at: string): SaveV1 {
  return { ...save, lastPlayed: { path, at } };
}

/** 기록 초기화: 최고 기록 · 오답 기록 · 마지막 세트를 지운다. 설정은 남긴다 */
export function clearRecords(save: SaveV1): SaveV1 {
  return { version: 1, bests: {}, srs: {}, settings: save.settings };
}

/** 시험·저장소를 못 쓰는 환경용 */
export function memoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
}

/** 완료 기록은 시간과 조작 수를 인자로 받는다. 다른 학습 모드의 타수와 섞지 않는다. */
export function saveVimResult(save: SaveV1, id: string, result: VimResult): SaveV1 {
  if (!vimResultSchema.safeParse(result).success) return save;
  const previous = save.vim?.[id];
  if (
    previous &&
    (previous.elapsedMs < result.elapsedMs ||
      (previous.elapsedMs === result.elapsedMs && previous.actions <= result.actions))
  )
    return save;
  return { ...save, vim: { ...save.vim, [id]: result } };
}
