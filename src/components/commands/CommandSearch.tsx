import { useEffect, useMemo, useRef, useState } from 'react';
import { searchCommands, type SearchEntry } from '../../lib/commands/search';

/** 명령 찾기: 명령 조각이나 하고 싶은 일(한국어)로 찾는다. 주소의 ?q= 로 처음 검색어를 받는다. 어디서든 / 를 누르면 입력 칸으로 */
export default function CommandSearch({ entries }: { entries: readonly SearchEntry[] }) {
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get('q') ?? '');
  const input = useRef<HTMLInputElement>(null);
  const results = useMemo(() => searchCommands(entries, query), [entries, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (e.key !== '/' || el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      input.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 검색어를 주소에 남겨 두어 뒤로 가기 · 공유에도 그대로
  useEffect(() => {
    const url = new URL(window.location.href);
    if (query.trim()) url.searchParams.set('q', query.trim());
    else url.searchParams.delete('q');
    window.history.replaceState(null, '', url);
  }, [query]);

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-2">
        <span className="text-sm text-slate-400">명령 조각이나 하고 싶은 일을 적어 보세요</span>
        <input
          ref={input}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예: 커밋 메시지를 고치고 싶어 · 원격 브랜치 지우기 · amend"
          autoFocus
          className="rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 text-lg text-slate-100 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
          aria-label="명령 찾기"
          data-testid="command-search"
        />
      </label>
      {query.trim() && (
        <div aria-live="polite">
          {results.length === 0 ? (
            <p className="text-slate-400" data-testid="no-result">
              맞는 명령을 못 찾았어요. 다른 낱말로 적어 보거나 아래 목록을 보세요.
            </p>
          ) : (
            <ol className="flex flex-col gap-2">
              {results.map((r) => (
                <li key={r.slug}>
                  <a
                    href={`/git/commands/${r.slug}`}
                    className="flex flex-col gap-1 rounded-lg border border-slate-700 p-3 hover:bg-slate-900"
                    data-testid="search-result"
                  >
                    <code className="font-mono text-emerald-300">{r.display}</code>
                    <span className="line-clamp-2 text-sm text-slate-400">{r.situations || r.notes}</span>
                  </a>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
