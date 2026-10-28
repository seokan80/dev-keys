import { expect, it } from 'vitest';
import { DEFAULT_SAVE, clearRecords, loadSave, memoryStore, saveSave, saveVimResult } from '@core/storage';

it('Vim 완료 기록을 저장하고 읽으며 같은 연습은 더 나은 기록만 남긴다', () => {
  const result = { at: '2026-10-28', elapsedMs: 1000, actions: 12 };
  const save = saveVimResult(DEFAULT_SAVE, 'vim-modes', result);
  expect(DEFAULT_SAVE.vim).toBeUndefined();
  expect(save.vim?.['vim-modes']).toEqual(result);
  expect(saveVimResult(save, 'vim-modes', { ...result, elapsedMs: 2000 })).toBe(save);
  const store = memoryStore();
  saveSave(store, save);
  expect(loadSave(store).vim?.['vim-modes']).toEqual(result);
  expect(clearRecords(save).vim).toBeUndefined();
});
it('잘못된 Vim 기록은 기존 데이터를 망가뜨리지 않는다', () => {
  expect(saveVimResult(DEFAULT_SAVE, 'vim-modes', { at: 'now', elapsedMs: -1, actions: 0 })).toBe(DEFAULT_SAVE);
});
