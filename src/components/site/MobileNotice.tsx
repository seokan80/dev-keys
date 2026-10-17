import { useState } from 'react';

/**
 * 키보드가 없는 기기(터치만)에서 연습 화면에 들어오면 알린다. 막지는 않는다 — 해설은 읽을 수 있고, 키보드를 연결했다면 그대로 친다
 */
export default function MobileNotice({ guideHref }: { guideHref?: string }) {
  const [touchOnly] = useState(
    () => window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(any-pointer: fine)').matches,
  );
  const [closed, setClosed] = useState(false);
  if (!touchOnly || closed) return null;
  return (
    <div
      role="note"
      className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
      data-testid="mobile-notice"
    >
      <span className="flex-1">
        이 연습은 키보드로 칩니다 — 키보드가 있는 컴퓨터에서 열어 보세요.
        {guideHref && (
          <>
            {' '}
            <a href={guideHref} className="underline">
              해설은 지금 읽을 수 있어요 ↓
            </a>
          </>
        )}
      </span>
      <button type="button" onClick={() => setClosed(true)} className="rounded bg-slate-800 px-2 py-1 text-xs">
        닫기
      </button>
    </div>
  );
}
