import { useMemo, useRef, useState } from 'react';
import { hintOf, judge, sameCommand, type Verdict } from '@core/challenge';
import { RECALL_POINTS, challengeScore, typingAccuracy, type RecallOutcome } from '@core/scoring';
import { pickDue, review as srsReview } from '@core/srs';
import { bestKey, recordBest, setLastPlayed, type Best } from '@core/storage';
import type { RecallLine } from '../../lib/content/check';
import { localDay } from '../../lib/day';
import { useReview } from '../../lib/review';
import { updateSave, useSave } from '../../lib/save';

export type ChallengeQuestion = RecallLine & { setTitle: string };

type Props = {
  setId: string;
  href: string;
  /** 이 세트의 문제 */
  questions: readonly ChallengeQuestion[];
  /** 같은 카테고리 모든 세트의 문제 (예정일이 지난 오답을 섞는다) */
  pool: readonly ChallengeQuestion[];
  /** 줄 앞 표시 (터미널의 $) */
  prompt?: string;
  basicHref: string;
  guideHref: string;
  next: { href: string; title: string } | null;
};

type Step =
  /** 묻는 중 */
  | { kind: 'ask'; hinted: boolean }
  /** 맞힘 — Enter 로 다음 */
  | { kind: 'correct'; input: string; verdict: Verdict }
  /** 틀림 · 정답 보기 — 정답을 한 번 따라 쳐야 다음 */
  | { kind: 'retype'; input: string | null; again: boolean };

type Done = { score: number; accuracy: number; elapsedMs: number; improved: boolean; previous: Best | null };

const percent = (n: number) => `${Math.round(n * 100)}%`;
const formatTime = (ms: number) => {
  const sec = Math.round(ms / 1000);
  return `${Math.floor(sec / 60)}분 ${sec % 60}초`;
};

/** 도전 모드 한 세트: 설명을 보고 명령을 떠올려 친다. 틀린 문제는 오답 반복(SRS)에 올라간다 */
export default function ChallengePlayer({ setId, href, questions, pool, prompt, basicHref, guideHref, next }: Props) {
  const save = useSave();
  const review = useReview();
  const [run, setRun] = useState(0);
  // 세트를 시작할 때 한 번 정한다 (푸는 동안 오답 기록이 바뀌어도 문제 순서는 그대로)
  const today = useMemo(() => localDay(), [run]); // eslint-disable-line react-hooks/exhaustive-deps
  const picked = useMemo(() => pickDue(questions, pool, save.srs, today), [run]); // eslint-disable-line react-hooks/exhaustive-deps

  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<Step>({ kind: 'ask', hinted: false });
  const [outcomes, setOutcomes] = useState<RecallOutcome[]>([]);
  const [input, setInput] = useState('');
  const [done, setDone] = useState<Done | null>(null);
  const typed = useRef({ inserted: 0, deleted: 0, startedAt: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  const items = picked.items;
  const q = items[index]!;
  const isReview = picked.review.includes(q.key);
  const points = outcomes.reduce((n, o) => n + RECALL_POINTS[o], 0);

  // 검수 모드에서는 오답 기록을 남기지 않는다
  const mark = (correct: boolean) => {
    if (!review) updateSave((s) => ({ ...s, srs: srsReview(s.srs, q.key, correct, today) }));
  };

  const answer = (outcome: RecallOutcome) => {
    setOutcomes((o) => [...o, outcome]);
    mark(outcome === 'correct' || outcome === 'hint');
  };

  const finish = (all: RecallOutcome[]) => {
    const t = typed.current;
    const elapsedMs = t.startedAt === 0 ? 0 : Date.now() - t.startedAt;
    const accuracy = typingAccuracy(t.inserted, t.deleted);
    const score = challengeScore(all, accuracy);
    const at = new Date().toISOString();
    const cpm = elapsedMs > 0 ? t.inserted / (elapsedMs / 60000) : 0;
    let outcome = { improved: false, previous: null as Best | null };
    if (!review)
      updateSave((s) => {
        const r = recordBest(s, bestKey(setId, 'recall'), { cpm, accuracy, score, at });
        outcome = r;
        return setLastPlayed(r.save, href, at);
      });
    setDone({ score, accuracy, elapsedMs, ...outcome });
  };

  const advance = () => {
    setInput('');
    if (index + 1 >= items.length) {
      finish(outcomes);
      return;
    }
    setIndex(index + 1);
    setStep({ kind: 'ask', hinted: false });
    inputRef.current?.focus();
  };

  const onChange = (value: string) => {
    if (step.kind === 'ask') {
      const t = typed.current;
      if (t.startedAt === 0) t.startedAt = Date.now();
      if (value.length > input.length) t.inserted += value.length - input.length;
      else t.deleted += input.length - value.length;
    }
    setInput(value);
  };

  const submit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (step.kind === 'correct') return advance();
    if (step.kind === 'retype') {
      if (judge(q, input).correct) return advance();
      setStep({ ...step, again: true });
      return;
    }
    if (input.trim() === '') return;
    const verdict = judge(q, input);
    if (verdict.correct) {
      answer(step.hinted ? 'hint' : 'correct');
      setStep({ kind: 'correct', input, verdict });
    } else {
      answer('wrong');
      setStep({ kind: 'retype', input, again: false });
      setInput('');
    }
  };

  const reveal = () => {
    answer('revealed');
    setStep({ kind: 'retype', input: null, again: false });
    setInput('');
    inputRef.current?.focus();
  };

  const restart = () => {
    setRun((r) => r + 1);
    setIndex(0);
    setStep({ kind: 'ask', hinted: false });
    setOutcomes([]);
    setInput('');
    setDone(null);
    typed.current = { inserted: 0, deleted: 0, startedAt: 0 };
  };

  if (done) {
    const missed = items.filter((_, i) => outcomes[i] === 'wrong' || outcomes[i] === 'revealed');
    const right = outcomes.filter((o) => o === 'correct' || o === 'hint').length;
    return (
      <section className="flex flex-col gap-6 rounded-lg border border-slate-700 bg-slate-900 p-6" data-testid="result">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold">완료!</h2>
          {review ? (
            <p className="text-fuchsia-300" data-testid="reviewed">
              검수 모드 — 기록하지 않았어요
            </p>
          ) : done.improved ? (
            <p className="text-emerald-300">
              새 최고 점수예요{done.previous?.score !== undefined ? ` (이전 ${done.previous.score}점)` : ''}
            </p>
          ) : (
            done.previous?.score !== undefined && <p className="text-slate-400">최고 점수는 {done.previous.score}점</p>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ['점수', `${done.score}점`],
            ['맞힘', `${right} / ${items.length}`],
            ['정확도', percent(done.accuracy)],
            ['시간', formatTime(done.elapsedMs)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md bg-slate-800/60 p-3">
              <dt className="text-xs text-slate-400">{label}</dt>
              <dd className="font-mono text-lg" data-testid={`result-${label}`}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-slate-500">
          점수 = 문제 점수 합(정답 100 · 힌트 뒤 정답 60) × (0.5 + 0.5 × 정확도). 정확도는 친 글자 중 지우지 않은 비율
        </p>
        {missed.length > 0 && (
          <div className="flex flex-col gap-2" data-testid="missed">
            <h3 className="font-bold">다시 볼 문제 — 내일부터 도전 모드에 다시 나와요</h3>
            <ul className="flex flex-col gap-2">
              {missed.map((m) => (
                <li key={m.key} className="rounded-md bg-slate-800/60 p-3 text-sm">
                  <p className="text-slate-300">{m.prompt.map((p) => p.text).join('')}</p>
                  <p className="font-mono text-emerald-300">{m.answers[0]}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800"
            onClick={restart}
          >
            다시 하기
          </button>
          <a href={basicHref} className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800">
            따라치기로
          </a>
          <a
            href={guideHref}
            className="rounded-lg border border-sky-700 px-4 py-2 text-sm text-sky-300 hover:bg-sky-500/10"
          >
            해설 읽기
          </a>
          {next && (
            <a
              href={next.href}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500"
              data-testid="next-set"
              ref={(el) => el?.focus()}
            >
              다음 도전: {next.title} →
            </a>
          )}
        </div>
      </section>
    );
  }

  const others = (typedInput: string) => q.answers.filter((a) => !sameCommand(typedInput, a));

  return (
    <section className="flex flex-col gap-4" aria-label="도전 모드">
      <div
        className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-slate-400"
        data-testid="challenge-status"
      >
        <span>
          문제{' '}
          <span className="font-mono text-slate-100">
            {index + 1} / {items.length}
          </span>
        </span>
        <span>
          점수 <span className="font-mono text-slate-100">{points}</span>
        </span>
        {picked.review.length > 0 && <span className="text-amber-300">복습 {picked.review.length}문제 포함</span>}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-slate-700 bg-slate-900 p-5" data-testid="question">
        {isReview && (
          <p className="text-xs text-amber-300" data-testid="review-badge">
            복습{q.setId !== setId ? ` · ${q.setTitle}` : ''}
          </p>
        )}
        <p className="text-lg leading-relaxed">
          {q.prompt.map((part, i) =>
            part.value ? (
              <code key={i} className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-emerald-300">
                {part.text}
              </code>
            ) : (
              <span key={i}>{part.text}</span>
            ),
          )}
        </p>
        {step.kind === 'ask' && step.hinted && (
          <p className="font-mono text-sm text-amber-200" data-testid="hint">
            힌트: {hintOf(q.answers[0]!)} …
          </p>
        )}
      </div>

      <form
        onSubmit={submit}
        className={`flex items-center gap-2 rounded-lg border bg-slate-900 px-3 py-2 font-mono ${
          step.kind === 'correct'
            ? 'border-emerald-500'
            : step.kind === 'retype'
              ? 'border-rose-500/70'
              : 'border-slate-600'
        }`}
      >
        {prompt && <span className="text-slate-500">{prompt}</span>}
        <input
          ref={inputRef}
          aria-label="답"
          className="flex-1 bg-transparent outline-none"
          value={step.kind === 'correct' ? step.input : input}
          readOnly={step.kind === 'correct'}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            // 검수 모드: ↓ 로 정답 채우기
            if (e.key === 'ArrowDown' && review && step.kind !== 'correct') {
              e.preventDefault();
              setInput(q.answers[0]!);
            }
          }}
          autoFocus
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={
            step.kind === 'correct'
              ? ''
              : step.kind === 'retype'
                ? '정답을 한 번 따라 치고 Enter'
                : '명령을 떠올려 치고 Enter'
          }
        />
      </form>

      {step.kind === 'ask' && (
        <div className="flex flex-wrap gap-3 text-sm">
          <button
            type="button"
            className="text-sky-300 hover:underline disabled:text-slate-500 disabled:no-underline"
            disabled={step.hinted}
            onClick={() => {
              setStep({ kind: 'ask', hinted: true });
              inputRef.current?.focus();
            }}
          >
            힌트 보기 (맞히면 {RECALL_POINTS.hint}점)
          </button>
          <button type="button" className="text-slate-400 hover:underline" onClick={reveal}>
            정답 보기 (0점)
          </button>
        </div>
      )}

      {step.kind === 'correct' && (
        <div
          className="flex flex-col gap-1 rounded-lg border border-emerald-700 bg-emerald-500/10 p-4 text-sm"
          data-testid="feedback"
          data-correct="true"
          aria-live="polite"
        >
          <p className="font-bold text-emerald-300">
            정답!{step.verdict.via === 'engine' && ' — 목록에 없는 명령이지만 엔진으로 실행해 보니 결과가 같아요'}
          </p>
          {others(step.input).length > 0 && (
            <p className="text-slate-300">
              같은 뜻:{' '}
              {others(step.input).map((a, i) => (
                <span key={a}>
                  {i > 0 && <span className="text-slate-500"> 또는 </span>}
                  <code className="font-mono text-emerald-200">{a}</code>
                </span>
              ))}
            </p>
          )}
          {q.note && <p className="text-slate-400">{q.note}</p>}
          <p className="text-xs text-slate-500">
            <kbd className="font-mono">Enter</kbd> 다음 문제
          </p>
        </div>
      )}

      {step.kind === 'retype' && (
        <div
          className="flex flex-col gap-1 rounded-lg border border-rose-800 bg-rose-500/10 p-4 text-sm"
          data-testid="feedback"
          data-correct="false"
          aria-live="polite"
        >
          <p className="font-bold text-rose-300">
            {step.input === null ? '정답' : '아쉬워요'}
            {step.input !== null && <span className="ml-2 font-mono font-normal text-slate-400">{step.input}</span>}
          </p>
          <p className="text-slate-300">
            정답:{' '}
            {q.answers.map((a, i) => (
              <span key={a}>
                {i > 0 && <span className="text-slate-500"> 또는 </span>}
                <code
                  className={`font-mono ${i === 0 ? 'text-emerald-300' : 'text-emerald-200/70'}`}
                  data-testid={i === 0 ? 'answer' : undefined}
                >
                  {a}
                </code>
              </span>
            ))}
          </p>
          {q.note && <p className="text-slate-400">{q.note}</p>}
          <p className={step.again ? 'text-amber-300' : 'text-xs text-slate-500'}>
            {step.again ? '정답 중 하나를 그대로 쳐 보세요' : '한 번 따라 치면 손에 남아요. 내일 다시 나와요'}
          </p>
        </div>
      )}
    </section>
  );
}
