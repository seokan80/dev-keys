import { setReview, useReview } from '../../lib/review';

/** 검수 모드 스위치 (개발 서버 · PR 미리보기에만 있다) */
export default function ReviewBar() {
  const on = useReview();
  return (
    <div
      className={`fixed right-3 bottom-3 z-50 flex max-w-xs flex-col gap-1 rounded-lg border px-3 py-2 text-xs shadow-lg ${
        on ? 'border-fuchsia-500 bg-fuchsia-950/90 text-fuchsia-100' : 'border-slate-700 bg-slate-900/90 text-slate-400'
      }`}
      data-testid="review-bar"
    >
      <label className="flex items-center gap-2 font-bold">
        <input type="checkbox" checked={on} onChange={(e) => setReview(e.target.checked)} />
        검수 모드
      </label>
      {on && (
        <p>
          <kbd className="font-mono">↓</kbd> 지금 줄 · 정답 채우기, <kbd className="font-mono">Enter</kbd> 로 출력 ·
          그림. 트리 미션은 입력이 비었을 때 ↓ 로 권장 풀이 다음 명령. 기록은 남기지 않는다
        </p>
      )}
    </div>
  );
}
