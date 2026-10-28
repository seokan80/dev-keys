import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { matchesVim, pressVim, vimCheckpoints, vimKeys, type VimState } from '@core/vim';
import { saveVimResult } from '@core/storage';
import type { VimLesson } from '../../lib/content/vim';
import { updateSave } from '../../lib/save';
import { useReview } from '../../lib/review';

const modes = {
  normal: 'Normal · 명령',
  insert: 'Insert · 입력',
  search: 'Search · 검색',
  command: 'Command · 저장/종료',
};
const labels: Record<string, string> = {
  '<Esc>': 'Esc',
  '<CR>': 'Enter',
  '<BS>': 'Backspace',
  '<C-r>': 'Ctrl+R',
  ' ': 'Space',
};
const button = 'rounded-md border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800';

function Buffer({ state, active = false }: { state: VimState; active?: boolean }) {
  return (
    <div className="min-w-max py-3 font-mono text-sm leading-7" data-testid={active ? 'vim-buffer' : 'vim-goal-buffer'}>
      {state.lines.map((line, row) => (
        <div key={row} className="flex whitespace-pre">
          <span aria-hidden="true" className="w-10 shrink-0 select-none pr-3 text-right text-slate-400">
            {row + 1}
          </span>
          <span>
            {state.cursor.row === row ? (
              <>
                {line.slice(0, state.cursor.col)}
                <span className={active ? 'bg-emerald-300 text-slate-950' : 'bg-sky-300 text-slate-950'}>
                  {line[state.cursor.col] ?? ' '}
                </span>
                {line.slice(state.cursor.col + 1)}
              </>
            ) : (
              line || ' '
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function VimPlayer({
  lesson,
  next,
}: {
  lesson: VimLesson;
  next: { href: string; title: string } | null;
}) {
  const checkpoints = useMemo(() => vimCheckpoints(lesson), [lesson]);
  const [view, setView] = useState({ state: checkpoints[0]!.start, step: 0 });
  // 빠른 입력도 직전 키의 상태를 기준으로 순서대로 처리한다.
  const current = useRef(view);
  const editor = useRef<HTMLDivElement>(null);
  const timing = useRef<{ start: number | null; actions: number; review: boolean }>({
    start: null,
    actions: 0,
    review: false,
  });
  const [hint, setHint] = useState(false);
  const [finished, setFinished] = useState<{ elapsedMs: number; actions: number; review: boolean } | null>(null);
  const review = useReview();
  const { state, step } = view;
  const task = lesson.steps[step];
  const goal = checkpoints[step]?.goal;
  const modified = JSON.stringify(state.lines) !== JSON.stringify(state.saved);

  const show = (value: typeof view) => {
    current.current = value;
    setView(value);
  };
  const accept = (value: VimState) => {
    const index = current.current.step;
    if (!matchesVim(value, checkpoints[index]!.goal, lesson.steps[index]!.checks)) {
      show({ state: value, step: index });
      return;
    }
    const step = index + 1;
    show({ state: value, step });
    setHint(false);
    if (step === lesson.steps.length) {
      const result = {
        elapsedMs: Math.max(0, Date.now() - (timing.current.start ?? Date.now())),
        actions: timing.current.actions,
        review: timing.current.review || review,
      };
      setFinished(result);
      if (!timing.current.review && !review)
        updateSave((save) => saveVimResult(save, lesson.id, { ...result, at: new Date().toISOString() }));
    }
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!lesson.steps[current.current.step]) return;
    if (event.key === 'Tab' || event.metaKey || event.altKey || (event.ctrlKey && event.key.toLowerCase() !== 'r'))
      return;
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(event.key)) return;
    event.preventDefault();
    timing.current.review ||= review;
    timing.current.start ??= Date.now();
    timing.current.actions++;
    if (review && event.key === 'ArrowDown') {
      accept(checkpoints[current.current.step]!.goal);
      return;
    }
    const key = event.ctrlKey
      ? '<C-r>'
      : ({ Escape: '<Esc>', Enter: '<CR>', Backspace: '<BS>' }[event.key] ?? event.key);
    accept(pressVim(current.current.state, event.nativeEvent.isComposing ? '<IME>' : key));
  };
  const restart = (all: boolean) => {
    const step = all ? 0 : current.current.step;
    show({ state: checkpoints[step]!.start, step });
    setHint(false);
    setFinished(null);
    if (all) timing.current = { start: null, actions: 0, review: false };
    editor.current?.focus();
  };

  return (
    <section className="flex flex-col gap-4" aria-label="Vim 연습">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p data-testid="vim-progress">
          {Math.min(step + 1, lesson.steps.length)} / {lesson.steps.length} 단계{finished ? ' · 완료' : ''}
        </p>
        <p className="text-slate-400">
          {review ? '검수 중 · ↓로 단계 완료 · 기록 제외' : '편집기 안을 클릭하고 영문 키보드로 조작하세요'}
        </p>
      </div>
      {task && (
        <div className="flex flex-col gap-3 rounded-lg border border-sky-700 bg-sky-500/5 p-4" aria-live="polite">
          <h2 className="font-bold text-sky-200" data-testid="vim-prompt">
            {task.prompt}
          </h2>
          <div>
            <button
              className="text-sm text-sky-300 underline"
              type="button"
              aria-expanded={hint}
              onClick={() => setHint(!hint)}
            >
              권장 키 {hint ? '숨기기' : '보기'}
            </button>
          </div>
          {hint && (
            <p className="flex flex-wrap items-center gap-1" data-testid="vim-hint">
              {vimKeys(task.keys).map((key, i) => (
                <kbd key={i} className="rounded border border-slate-600 bg-slate-900 px-2 py-1 font-mono text-sm">
                  {labels[key] ?? key}
                </kbd>
              ))}
              <span className="ml-2 text-xs text-slate-400">
                순서대로 누르세요. &lt;Esc&gt; 글자를 입력하지 않아요.
              </span>
            </p>
          )}
        </div>
      )}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-slate-600 bg-slate-900">
          <div className="flex flex-wrap justify-between gap-2 border-b border-slate-700 px-3 py-2 text-xs">
            <strong className="text-emerald-300" data-testid="vim-mode">
              {state.closed ? '종료됨' : modes[state.mode]}
            </strong>
            <span className="text-slate-300" data-testid="vim-cursor">
              {state.cursor.row + 1}행 {state.cursor.col + 1}열 · {modified ? '변경 있음' : '저장됨'}
            </span>
          </div>
          <div
            ref={editor}
            role="textbox"
            aria-label="Vim 편집기"
            aria-multiline="true"
            aria-readonly={state.closed || !!finished}
            aria-describedby="vim-help"
            tabIndex={0}
            className="min-h-48 overflow-x-auto outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-400"
            onKeyDown={onKeyDown}
            onPaste={(event) => event.preventDefault()}
          >
            <Buffer state={state} active />
          </div>
          <div
            className="min-h-10 border-t border-slate-700 px-3 py-2 font-mono text-sm text-emerald-300"
            data-testid="vim-command"
          >
            {state.mode === 'command'
              ? `:${state.command}`
              : state.mode === 'search'
                ? `/${state.command}`
                : state.pending || (state.closed ? '가상 파일 편집 종료' : '키 입력 대기')}
          </div>
        </div>
        {goal && (
          <aside className="overflow-hidden rounded-lg border border-slate-700">
            <div className="border-b border-slate-700 px-3 py-2 text-xs text-sky-300">
              이 단계의 목표 · {goal.closed ? '종료됨' : modes[goal.mode]} · {goal.cursor.row + 1}행{' '}
              {goal.cursor.col + 1}열
            </div>
            <div className="overflow-x-auto">
              <Buffer state={goal} />
            </div>
            {task?.checks.includes('register') && (
              <p className="px-3 pb-3 text-xs text-slate-400">
                복사할 줄: <code>{goal.register?.text.join('\n')}</code>
              </p>
            )}
            {task?.checks.includes('saved') && (
              <p className="px-3 pb-3 text-xs text-slate-400">이 본문을 가상 파일에 저장하세요.</p>
            )}
          </aside>
        )}
      </div>
      <p role="status" className="min-h-6 text-sm text-rose-300" data-testid="vim-error">
        {state.error}
      </p>
      {state.closed && !finished && (
        <p className="text-sm text-amber-300">목표에 도달하기 전에 종료했어요. ‘이 단계 다시’로 이어 가세요.</p>
      )}
      <p className="text-xs text-slate-400" data-testid="vim-register">
        복사·삭제 버퍼:{' '}
        {state.register
          ? `${state.register.kind === 'line' ? '줄' : '글자'} · ${state.register.text.join(' / ')}`
          : '비어 있음'}
      </p>
      {finished ? (
        <div
          className="flex flex-col gap-3 rounded-lg border border-emerald-700 bg-emerald-500/5 p-4"
          data-testid="vim-result"
          aria-live="polite"
        >
          <h2 className="text-xl font-bold text-emerald-300">연습 완료!</h2>
          <p>
            {(finished.elapsedMs / 1000).toFixed(1)}초 · 키 조작 {finished.actions}회
            {finished.review ? ' · 검수 기록 제외' : ' · 이 브라우저에 완료 기록을 남겼어요'}
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <a href="/vim" className="text-sky-300 underline">
              Vim 목록
            </a>
            <a href="/me" className="text-sky-300 underline">
              내 기록
            </a>
            {next && (
              <a href={next.href} className="text-emerald-300 underline">
                다음: {next.title} →
              </a>
            )}
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {!finished && (
          <button type="button" className={button} onClick={() => restart(false)}>
            이 단계 다시
          </button>
        )}
        <button type="button" className={button} onClick={() => restart(true)}>
          처음부터
        </button>
      </div>
      <details id="vim-help" className="rounded-lg border border-slate-700 p-4 text-sm text-slate-300">
        <summary className="cursor-pointer">지원 키와 조작 안내</summary>
        <ul className="mt-3 flex list-inside list-disc flex-col gap-2">
          <li>이동: h j k l · 0 · $ · gg · G</li>
          <li>입력: i a I A · 영문·기호 · Enter · Backspace · Esc</li>
          <li>편집: x · r 다음 한 글자 · dd · yy · p P · u · Ctrl+R</li>
          <li>검색: /단어 + Enter · n N (영문·숫자·공백·_·-)</li>
          <li>가상 파일: :w · :q · :q! · :wq + Enter. 실제 파일에는 접근하지 않아요.</li>
          <li>편집기에 초점이 있을 때 Ctrl+R은 다시 실행이에요. Tab으로 편집기를 벗어날 수 있어요.</li>
          <li>횟수·w/b·Visual·정규식·클립보드 붙여넣기는 지원하지 않아요. 막히면 이 단계를 다시 시작하세요.</li>
        </ul>
      </details>
    </section>
  );
}
