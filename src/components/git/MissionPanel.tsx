import { useEffect, useMemo, useRef, useState } from 'react';
import { compare, execute, layoutSteps, layoutTree, type GitError, type RepoState, type TreeLayout } from '@core/git';
import { missionScore } from '@core/scoring';
import { useReview } from '../../lib/review';
import GitTree from './GitTree';

export type MissionProps = {
  title: string;
  timeLimitSec: number;
  start: RepoState;
  solution: readonly string[];
  next: { href: string; title: string } | null;
  guideHref: string;
};

type Entry = { input: string; output: string; error: GitError | null };

const clock = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** 트리 미션: 명령을 쳐서 현재 트리를 목표 트리와 같게 만든다. 결과가 같으면 어떤 풀이든 성공 */
export default function MissionPanel({ title, timeLimitSec, start, solution, next, guideHref }: MissionProps) {
  const goal = useMemo(() => layoutSteps(start, solution), [start, solution]);
  const review = useReview();
  const startLayout = useMemo(() => layoutTree(start), [start]);

  const [repo, setRepo] = useState<RepoState>(start);
  const [layout, setLayout] = useState<TreeLayout>(startLayout);
  const [previous, setPrevious] = useState<TreeLayout | undefined>(undefined);
  const [log, setLog] = useState<Entry[]>([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [commands, setCommands] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [solved, setSolved] = useState<{ at: number; commands: number } | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (startedAt === null || solved) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [startedAt, solved]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [log]);

  const elapsed = startedAt === null ? 0 : ((solved?.at ?? now) - startedAt) / 1000;
  const left = timeLimitSec - elapsed;
  const diffs = compare(repo, goal.state, start).diffs;

  const submit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || solved) return;
    const t = Date.now();
    if (startedAt === null) setStartedAt(t);
    setNow(t);
    const r = execute(repo, text);
    setLog((l) => [...l, { input: text, output: r.output, error: r.error }]);
    setHistory((h) => [...h, text]);
    setCursor(null);
    setInput('');
    if (r.error) return;
    const nextLayout = layoutTree(r.state, layout);
    setPrevious(layout);
    setLayout(nextLayout);
    setRepo(r.state);
    setCommands((n) => n + 1);
    if (compare(r.state, goal.state, start).equal) setSolved({ at: t, commands: commands + 1 });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    // 검수 모드: 입력이 비어 있고 기록을 넘겨 보는 중이 아니면 ↓ 로 권장 풀이의 다음 명령
    if (review && e.key === 'ArrowDown' && cursor === null && input === '') {
      e.preventDefault();
      setInput(solution[Math.min(commands, solution.length - 1)]!);
      return;
    }
    e.preventDefault();
    if (history.length === 0) return;
    const i =
      e.key === 'ArrowUp'
        ? Math.max(0, (cursor ?? history.length) - 1)
        : cursor === null
          ? null
          : cursor + 1 >= history.length
            ? null
            : cursor + 1;
    setCursor(i);
    setInput(i === null ? '' : history[i]!);
  };

  const restart = () => {
    setRepo(start);
    setLayout(startLayout);
    setPrevious(undefined);
    setLog([]);
    setCommands(0);
    setStartedAt(null);
    setSolved(null);
    setShowDiff(false);
    setInput('');
    inputRef.current?.focus();
  };

  return (
    <section className="flex flex-col gap-4" aria-label={`${title} 미션`}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-400" data-testid="mission-status">
        <span>
          남은 시간{' '}
          <span className={`font-mono ${left < 0 ? 'text-rose-400' : left < 15 ? 'text-amber-300' : 'text-slate-100'}`}>
            {left < 0 ? `시간 초과 +${clock(-left)}` : clock(left)}
          </span>
        </span>
        <span>
          명령 <span className="font-mono text-slate-100">{commands}</span>
          <span className="text-slate-500"> / 권장 {solution.length}</span>
        </span>
        <button
          type="button"
          className="ml-auto rounded-md border border-slate-700 px-3 py-1 hover:bg-slate-800"
          onClick={restart}
        >
          처음부터
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <figure className="flex flex-col gap-2 rounded-lg border border-slate-700 bg-slate-900 p-3">
          <figcaption className="text-sm font-bold text-slate-200">지금</figcaption>
          <GitTree state={repo} layout={layout} previous={previous} title="지금 커밋 트리" />
        </figure>
        <figure className="flex flex-col gap-2 rounded-lg border border-emerald-800 bg-slate-900 p-3">
          <figcaption className="text-sm font-bold text-emerald-300">목표</figcaption>
          <GitTree state={goal.state} layout={goal.layout} showOrphans={false} title="목표 커밋 트리" />
        </figure>
      </div>

      {solved ? (
        <div
          className="flex flex-col gap-3 rounded-lg border border-emerald-600 bg-emerald-500/10 p-4"
          data-testid="mission-solved"
        >
          <p className="text-lg font-bold text-emerald-300">
            성공!{' '}
            <span className="font-mono" data-testid="mission-score">
              {missionScore({
                solved: true,
                secondsLeft: left,
                commands: solved.commands,
                recommended: solution.length,
              })}
              점
            </span>
          </p>
          <p className="text-sm text-slate-300">
            명령 {solved.commands}개 (권장 {solution.length}개) · {clock(elapsed)}
            {elapsed > timeLimitSec ? ' — 시간을 넘겨 점수는 0점' : ' — 남은 초 × 10, 권장보다 많은 명령마다 −100'}
          </p>
          <div className="text-sm">
            <p className="text-slate-400">권장 풀이</p>
            <pre className="mt-1 font-mono text-slate-200">{solution.map((c) => `$ ${c}`).join('\n')}</pre>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="rounded-md border border-slate-600 px-3 py-1.5 text-sm" onClick={restart}>
              다시 하기
            </button>
            <a href={guideHref} className="rounded-md border border-sky-700 px-3 py-1.5 text-sm text-sky-300">
              해설 읽기
            </a>
            {next && (
              <a
                href={next.href}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white"
                data-testid="next-mission"
              >
                다음 미션: {next.title} →
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div
            ref={logRef}
            className="max-h-56 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-sm"
            aria-live="polite"
            data-testid="mission-log"
          >
            {log.length === 0 && <p className="text-slate-500">git 명령을 입력하세요. 앞의 git 은 빼도 된다.</p>}
            {log.map((entry, i) => (
              <div key={i} className="mb-1">
                <p className="text-slate-200">$ {entry.input}</p>
                {entry.output && <pre className="whitespace-pre-wrap text-slate-400">{entry.output}</pre>}
                {entry.error && (
                  <>
                    <p className="text-rose-300">{entry.error.message}</p>
                    <p className="font-sans text-amber-200">→ {entry.error.hint}</p>
                  </>
                )}
              </div>
            ))}
          </div>
          <form
            onSubmit={submit}
            className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 font-mono"
          >
            <span className="text-slate-500">$</span>
            <input
              ref={inputRef}
              aria-label="git 명령"
              className="flex-1 bg-transparent outline-none"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="명령을 치고 Enter"
            />
          </form>
          <div className="text-sm">
            <button type="button" className="text-sky-300 hover:underline" onClick={() => setShowDiff((v) => !v)}>
              {showDiff ? '힌트 닫기' : '힌트: 목표와 무엇이 다른가'}
            </button>
            {showDiff && (
              <ul className="mt-1 list-disc pl-5 text-slate-300" data-testid="mission-diffs">
                {diffs.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
