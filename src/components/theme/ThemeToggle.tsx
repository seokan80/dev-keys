import { useState } from 'react';

const KEY = 'devkeys:theme';
type Theme = 'dark' | 'light';

/** 블랙 / 화이트 테마 전환 (모든 페이지 오른쪽 위). 선택은 브라우저에 저장하고, 다음에 열 때 <head> 에서 먼저 적용한다 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
  );

  const toggle = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    if (next === 'light') document.documentElement.dataset.theme = 'light';
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // 저장소를 못 쓰면 이번 화면에서만
    }
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={theme === 'light'}
      title={theme === 'light' ? '블랙 테마로 바꾸기' : '화이트 테마로 바꾸기'}
      className="fixed top-3 right-3 z-40 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
      data-testid="theme-toggle"
    >
      {theme === 'light' ? '☾ 블랙' : '☀ 화이트'}
    </button>
  );
}
