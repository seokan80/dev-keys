// 저장값을 React 에서 쓰는 곳. 서버에서 그릴 때는 기본값, 브라우저에서는 localStorage 값.
import { useSyncExternalStore } from 'react';
import { DEFAULT_SAVE, STORAGE_KEY, loadSave, saveSave, type SaveV1 } from '@core/storage';
import { browserStore } from './browser-storage';

let cache: SaveV1 | null = null;
const listeners = new Set<() => void>();

function read(): SaveV1 {
  cache ??= loadSave(browserStore());
  return cache;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // 다른 탭에서 바꾼 값도 따라간다
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function updateSave(change: (save: SaveV1) => SaveV1): SaveV1 {
  const next = change(read());
  cache = next;
  saveSave(browserStore(), next);
  listeners.forEach((l) => l());
  return next;
}

export function useSave(): SaveV1 {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_SAVE);
}
