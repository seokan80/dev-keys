import type { Best } from '@core/storage';
import type { TypingStats } from '@core/typing';
import NextSetCard, { type NextSet } from './NextSetCard';

type Props = {
  stats: TypingStats;
  improved: boolean;
  previous: Best | null;
  next: NextSet | null;
  /** 해설 문서 위치 */
  guideHref?: string;
  onRetry: () => void;
};

const percent = (n: number | null) => (n === null ? '—' : `${Math.round(n * 100)}%`);

const formatTime = (ms: number) => {
  const sec = Math.round(ms / 1000);
  return `${Math.floor(sec / 60)}분 ${sec % 60}초`;
};

/** 세트를 끝냈을 때: 기록 · 최고 기록 비교 · 다시 하기 · 다음 세트 */
export default function ResultScreen({ stats, improved, previous, next, guideHref, onRetry }: Props) {
  return (
    <section className="flex flex-col gap-6 rounded-lg border border-slate-700 bg-slate-900 p-6" data-testid="result">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold">완료!</h2>
        {improved ? (
          <p className="text-emerald-300">
            새 최고 기록이에요{previous ? ` (이전 ${Math.round(previous.cpm)}타)` : ''}
          </p>
        ) : (
          previous && <p className="text-slate-400">최고 기록은 {Math.round(previous.cpm)}타</p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ['타수', `${Math.round(stats.cpm)}타/분`],
          ['정확도', percent(stats.accuracy)],
          ['시간', formatTime(stats.elapsedMs)],
          ['오타', `${stats.incorrect}번`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md bg-slate-800/60 p-3">
            <dt className="text-xs text-slate-400">{label}</dt>
            <dd className="font-mono text-lg">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <div className="flex gap-3 sm:flex-col">
          <button
            type="button"
            className="flex-1 rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800"
            onClick={onRetry}
          >
            다시 하기
          </button>
          {guideHref && (
            <a
              href={guideHref}
              className="flex flex-1 items-center justify-center rounded-lg border border-sky-700 px-4 py-2 text-sm text-sky-300 hover:bg-sky-500/10"
            >
              해설 읽기
            </a>
          )}
        </div>
        <div className="flex-1">
          <NextSetCard next={next} autoFocus />
        </div>
      </div>
    </section>
  );
}
