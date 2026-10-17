import { bestKey } from '@core/storage';
import { useSave } from '../../lib/save';

export type MapPart = {
  no: number;
  title: string;
  description: string;
  sets: { id: string; title: string; href: string }[];
};

/**
 * 시즌 1 Git 지도: 1~5부 세트를 차례로 늘어놓고, 따라치기를 끝낸 세트에는 체크와 최고 타수를 붙인다.
 * 서버에서는 기록 없이 그리고(검색 노출용 링크), 브라우저에서 저장값으로 진도를 채운다
 */
export default function SeasonMap({ parts }: { parts: readonly MapPart[] }) {
  const save = useSave();
  const all = parts.flatMap((p) => p.sets);
  const best = (id: string) => save.bests[bestKey(id, 'copy')];
  const doneCount = all.filter((s) => best(s.id)).length;
  const next = all.find((s) => !best(s.id))?.id;

  return (
    <div className="flex flex-col gap-4" data-testid="season-map">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-slate-400" data-testid="map-progress">
          {all.length}세트 중 <strong className="font-mono text-slate-100">{doneCount}</strong>개 끝냈어요
        </p>
        <div className="h-1.5 overflow-hidden rounded bg-slate-800" aria-hidden="true">
          <div className="h-full bg-emerald-400" style={{ width: `${(doneCount / Math.max(1, all.length)) * 100}%` }} />
        </div>
      </div>
      <ol className="flex flex-col gap-3">
        {parts.map((part) => {
          const done = part.sets.filter((s) => best(s.id)).length;
          return (
            <li key={part.no} className="rounded-lg border border-slate-700 p-4" data-testid="map-part">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-bold">
                  <span className="text-slate-500">{part.no}부</span> {part.title}
                </h3>
                <span className="font-mono text-xs text-slate-500">
                  {done}/{part.sets.length}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400">{part.description}</p>
              <ol className="mt-3 flex flex-wrap gap-2">
                {part.sets.map((set) => {
                  const b = best(set.id);
                  const isNext = set.id === next;
                  return (
                    <li key={set.id}>
                      <a
                        href={set.href}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${
                          b
                            ? 'border-emerald-600/70 bg-emerald-500/10 text-emerald-200'
                            : isNext
                              ? 'border-amber-400/70 bg-amber-500/10 text-amber-100'
                              : 'border-slate-700 text-slate-300 hover:bg-slate-900'
                        }`}
                        data-testid="map-set"
                        data-done={b ? 'true' : 'false'}
                      >
                        {b ? <span aria-label="끝냄">✓</span> : isNext ? <span className="text-xs">다음</span> : null}
                        {set.title}
                        {b && <span className="font-mono text-xs text-emerald-400">{Math.round(b.cpm)}타</span>}
                      </a>
                    </li>
                  );
                })}
              </ol>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
