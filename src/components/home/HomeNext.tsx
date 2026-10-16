import { recommend, resumeOf, type PlanSet } from '../../lib/content/recommend';
import { localDay } from '../../lib/day';
import { useSave } from '../../lib/save';

/** 메인: 이어하기 · 오늘의 추천 (브라우저 저장값으로 정하니 브라우저에서만 그린다) */
export default function HomeNext({ sets }: { sets: readonly PlanSet[] }) {
  const save = useSave();
  const resume = resumeOf(sets, save.lastPlayed);
  const pick = recommend(sets, save, localDay());
  const reason =
    pick?.kind === 'review'
      ? `복습할 문제 ${pick.count}개 — 도전 모드`
      : pick?.kind === 'challenge'
        ? '따라치기를 마쳤어요 — 이제 뜻 보고 치기'
        : resume || Object.keys(save.bests).length > 0
          ? '다음 세트'
          : '처음 시작한다면';
  if (!resume && !pick) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {pick && (
        <a
          href={pick.href}
          className="flex flex-col gap-1 rounded-lg border border-emerald-600/70 bg-emerald-500/5 p-4 hover:bg-emerald-500/10"
          data-testid="today-pick"
        >
          <span className="text-xs text-emerald-300">오늘의 추천 · {reason}</span>
          <strong className="text-lg">{pick.title}</strong>
        </a>
      )}
      {resume && (
        <a
          href={resume.href}
          className="flex flex-col gap-1 rounded-lg border border-slate-700 p-4 hover:bg-slate-900"
          data-testid="resume"
        >
          <span className="text-xs text-slate-400">
            이어하기 · {resume.mode === 'recall' ? '도전 모드' : '따라치기'}
          </span>
          <strong className="text-lg">{resume.title}</strong>
        </a>
      )}
    </div>
  );
}
