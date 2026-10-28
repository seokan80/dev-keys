import { useState } from 'react';
import { isDue } from '@core/srs';
import { clearRecords } from '@core/storage';
import { localDay } from '../../lib/day';
import { updateSave, useSave } from '../../lib/save';
import SettingsControls from '../settings/SettingsControls';

export type MeSet = { id: string; title: string; href: string; challengeHref: string | null; category: string };
export type MeRecall = { key: string; prompt: string; answer: string; setTitle: string; challengeHref: string };

const percent = (n: number) => `${Math.round(n * 100)}%`;
const shortDate = (day: string) => {
  const [, m, d] = day.split('-').map(Number);
  return `${m}월 ${d}일`;
};

/** 내 기록: 최고 기록 · 복습할 문제 · 설정 · 기록 초기화 (브라우저에만 저장된다) */
export default function MyRecords({
  sets,
  recalls,
  vimLessons = [],
}: {
  sets: readonly MeSet[];
  recalls: readonly MeRecall[];
  vimLessons?: readonly { id: string; title: string; href: string }[];
}) {
  const save = useSave();
  const [confirming, setConfirming] = useState(false);
  const today = localDay();
  const byKey = new Map(recalls.map((r) => [r.key, r]));

  const played = sets.filter((s) => save.bests[`${s.id}:copy`] || save.bests[`${s.id}:recall`]);
  const wrongs = Object.entries(save.srs)
    .filter(([key]) => byKey.has(key))
    .sort(([, a], [, b]) => a.due.localeCompare(b.due));
  const gone = Object.keys(save.srs).length - wrongs.length;

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3" aria-labelledby="bests">
        <h2 id="bests" className="text-xl font-bold">
          최고 기록
        </h2>
        {played.length === 0 ? (
          <p className="text-slate-400">아직 기록이 없어요. 세트를 하나 끝내면 여기에 남아요.</p>
        ) : (
          <table className="w-full text-left text-sm" data-testid="bests">
            <thead className="text-xs text-slate-400">
              <tr>
                <th className="py-2 font-normal">세트</th>
                <th className="py-2 font-normal">따라치기</th>
                <th className="py-2 font-normal">도전</th>
              </tr>
            </thead>
            <tbody>
              {played.map((s) => {
                const copy = save.bests[`${s.id}:copy`];
                const recall = save.bests[`${s.id}:recall`];
                return (
                  <tr key={s.id} className="border-t border-slate-800">
                    <td className="py-2">
                      <a href={s.href} className="hover:underline">
                        <span className="text-slate-400">{s.category} · </span>
                        {s.title}
                      </a>
                    </td>
                    <td className="py-2 font-mono">
                      {copy ? `${Math.round(copy.cpm)}타 · ${percent(copy.accuracy)}` : '—'}
                    </td>
                    <td className="py-2 font-mono">
                      {recall?.score !== undefined ? (
                        `${recall.score}점`
                      ) : s.challengeHref ? (
                        <a href={s.challengeHref} className="font-sans text-amber-300 hover:underline">
                          도전하기
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {vimLessons.some((l) => save.vim?.[l.id]) && (
        <section className="flex flex-col gap-3" aria-labelledby="vim-records">
          <h2 id="vim-records" className="text-xl font-bold">
            Vim 편집 연습
          </h2>
          <p className="text-sm text-slate-400">
            완료한 연습의 가장 짧은 시간과 키 조작 수예요. 타수와 별도로 기록해요.
          </p>
          <ul className="flex flex-col gap-2" data-testid="vim-records">
            {vimLessons
              .filter((l) => save.vim?.[l.id])
              .map((l) => {
                const result = save.vim![l.id]!;
                return (
                  <li key={l.id} className="flex flex-wrap justify-between gap-2 rounded-md bg-slate-900 p-3 text-sm">
                    <a href={l.href} className="text-sky-300 hover:underline">
                      {l.title}
                    </a>
                    <span>
                      {(result.elapsedMs / 1000).toFixed(1)}초 · {result.actions}회
                    </span>
                  </li>
                );
              })}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="wrongs">
        <h2 id="wrongs" className="text-xl font-bold">
          복습할 문제
        </h2>
        <p className="text-sm text-slate-400">
          도전 모드에서 틀린 문제는 하루 · 3일 · 7일 · 14일 뒤 다시 나와요. 예정일에 맞히면 다음 간격으로, 마지막까지
          맞히면 목록에서 빠져요.
        </p>
        {wrongs.length === 0 ? (
          <p className="text-slate-400">복습할 문제가 없어요.</p>
        ) : (
          <ul className="flex flex-col gap-2" data-testid="wrongs">
            {wrongs.map(([key, entry]) => {
              const r = byKey.get(key)!;
              const due = isDue(entry, today);
              return (
                <li key={key} className="flex flex-col gap-1 rounded-md bg-slate-900 p-3 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-slate-200">{r.prompt}</span>
                    <span className={due ? 'text-amber-300' : 'text-slate-400'}>
                      {due ? '오늘 복습' : `${shortDate(entry.due)} 복습`} · 틀린 횟수 {entry.wrong}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <details>
                      <summary className="cursor-pointer text-xs text-slate-400">정답 보기</summary>
                      <code className="font-mono text-emerald-300">{r.answer}</code>
                    </details>
                    <a href={r.challengeHref} className="text-xs text-sky-300 hover:underline">
                      {r.setTitle} 도전 →
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {gone > 0 && <p className="text-xs text-slate-400">지금은 없는 문제 기록 {gone}개는 보이지 않아요.</p>}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="settings">
        <h2 id="settings" className="text-xl font-bold">
          설정
        </h2>
        <SettingsControls settings={save.settings} showScenes className="text-sm" />
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="reset">
        <h2 id="reset" className="text-xl font-bold">
          기록 초기화
        </h2>
        <p className="text-sm text-slate-400">
          기록은 이 브라우저에만 저장돼요. 초기화하면 최고 기록 · Vim 완료 기록 · 복습할 문제 · 이어하기가 지워지고
          설정은 남아요.
        </p>
        {confirming ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-rose-300">정말 지울까요? 되돌릴 수 없어요.</span>
            <button
              type="button"
              className="rounded-md bg-rose-600 px-3 py-1.5 font-bold text-white hover:bg-rose-500"
              onClick={() => {
                updateSave(clearRecords);
                setConfirming(false);
              }}
            >
              지우기
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-600 px-3 py-1.5 hover:bg-slate-800"
              onClick={() => setConfirming(false)}
            >
              취소
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="self-start rounded-md border border-rose-800 px-3 py-1.5 text-sm text-rose-300 hover:bg-rose-500/10"
            onClick={() => setConfirming(true)}
          >
            기록 초기화
          </button>
        )}
      </section>
    </div>
  );
}
