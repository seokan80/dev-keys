import { memoryStore, type KeyValueStore } from '@core/storage';

let store: KeyValueStore | null = null;

/** localStorage 를 쓸 수 없으면(사생활 보호 모드·차단) 이번 방문 동안만 메모리에 둔다 */
export function browserStore(): KeyValueStore {
  if (store) return store;
  try {
    const ls = window.localStorage;
    const probe = 'devkeys:probe';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    store = ls;
  } catch {
    store = memoryStore();
  }
  return store;
}
