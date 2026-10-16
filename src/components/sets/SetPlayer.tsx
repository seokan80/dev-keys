import { useState } from 'react';
import { bestKey, recordBest, setLastPlayed, type Best } from '@core/storage';
import type { TypingStats } from '@core/typing';
import type { CodeLine, SetGraph } from '../../lib/content/check';
import { useReview } from '../../lib/review';
import { updateSave, useSave } from '../../lib/save';
import LiveGraph from '../git/LiveGraph';
import GitScene from '../scenes/GitScene';
import SettingsControls from '../settings/SettingsControls';
import TypingArea from '../typing/TypingArea';
import type { NextSet } from './NextSetCard';
import ResultScreen from './ResultScreen';

type Props = {
  setId: string;
  href: string;
  lines: readonly CodeLine[];
  next: NextSet | null;
  /** 줄 위 해설의 주석 표시 (# 또는 //) */
  commentMark?: string;
  /** 줄 앞 표시 (터미널의 $) */
  prompt?: string;
  /** 결과 값 앞 표시 (→) */
  outputMark?: string;
  /** 해설 문서 위치 (결과 화면의 "해설 읽기") */
  guideHref?: string;
  /** 도전 모드 주소 (뜻 보고 치기 문제가 있는 세트) */
  challengeHref?: string;
  /** engine 세트의 커밋 그래프 — 타자 영역 옆에 늘 보인다 */
  graph?: SetGraph | null;
};

type Phase =
  | { kind: 'typing'; run: number }
  | { kind: 'result'; run: number; stats: TypingStats; improved: boolean; previous: Best | null; reviewed?: boolean };

/** 기본 모드 한 세트: 설정 · 최고 기록 · 따라치기 · 결과 */
export default function SetPlayer({
  setId,
  href,
  lines,
  next,
  commentMark,
  prompt,
  outputMark,
  guideHref,
  challengeHref,
  graph = null,
}: Props) {
  const save = useSave();
  const review = useReview();
  const [phase, setPhase] = useState<Phase>({ kind: 'typing', run: 0 });
  const key = bestKey(setId, 'copy');
  const best = save.bests[key];
  const { settings } = save;

  const hasScenes = graph !== null || lines.some((l) => l.scene !== null);
  const showGraph = graph !== null && settings.showScenes;
  /** 지금 치는 줄 (다 치면 lines.length) */
  const [lineAt, setLineAt] = useState(0);
  const graphStep = lineAt < lines.length ? (lines[lineAt]?.graph?.during ?? 0) : (lines.at(-1)?.graph?.after ?? 0);
  const lastLine = lineAt > 0 ? lines[lineAt - 1] : undefined;
  // 그래프 아래에는 방금 친 명령을 보인다 — 대화형 답 줄(y · n)이면 그 질문을 띄운 명령
  const lastCommand = (() => {
    for (let k = lineAt - 1; k >= 0; k--) if (!lines[k]!.prompt) return lines[k]!.text;
    return null;
  })();
  const previousScene = (i: number) => {
    for (let k = i - 1; k >= 0; k--) if (lines[k]!.scene) return lines[k]!.scene;
    return null;
  };

  const onFinish = (stats: TypingStats) => {
    if (review) {
      // 검수 모드: 기록하지 않는다
      setPhase({ kind: 'result', run: phase.run, stats, improved: false, previous: best ?? null, reviewed: true });
      return;
    }
    const at = new Date().toISOString();
    let outcome: { improved: boolean; previous: Best | null } = { improved: false, previous: null };
    updateSave((s) => {
      const r = recordBest(s, key, { cpm: stats.cpm, accuracy: stats.accuracy ?? 0, at });
      outcome = r;
      return setLastPlayed(r.save, href, at);
    });
    setPhase({ kind: 'result', run: phase.run, stats, ...outcome });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-slate-400" data-testid="best">
          {best
            ? `최고 기록 ${Math.round(best.cpm)}타 · 정확도 ${Math.round(best.accuracy * 100)}%`
            : '아직 기록이 없어요'}
        </p>
        <SettingsControls settings={settings} showScenes={hasScenes} />
      </div>

      <div className={showGraph ? 'grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]' : 'contents'}>
        {showGraph && (
          <div className="lg:sticky lg:top-4 lg:order-2">
            <LiveGraph
              graph={graph}
              step={graphStep}
              last={lastLine && lastCommand ? { command: lastCommand, caption: lastLine.graph?.caption ?? null } : null}
            />
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-4">
          {phase.kind === 'result' ? (
            <ResultScreen
              stats={phase.stats}
              improved={phase.improved}
              previous={phase.previous}
              next={next}
              guideHref={guideHref}
              challengeHref={challengeHref}
              reviewed={phase.reviewed}
              onRetry={() => {
                setLineAt(0);
                setPhase({ kind: 'typing', run: phase.run + 1 });
              }}
            />
          ) : (
            <TypingArea
              // 설정을 바꾸면 처음부터 다시 시작한다
              key={`${phase.run}-${settings.autoIndent}-${settings.sixFinger}`}
              lines={lines.map((l) => l.text)}
              comments={lines.map((l) => l.comments)}
              outputs={lines.map((l) => l.output)}
              commentMark={commentMark}
              prompt={prompt}
              prompts={lines.map((l) => l.prompt)}
              outputMark={outputMark}
              // 세 칸 그림만 Enter 로 멈춘다. 커밋 그래프는 옆에서 늘 바뀐다
              pauseAfter={lines.map((l) => settings.showScenes && l.scene !== null)}
              renderScene={(i) => <GitScene scene={lines[i]!.scene!} previous={previousScene(i)} />}
              typingOptions={{ autoIndent: settings.autoIndent }}
              keyboardOptions={{ sixFinger: settings.sixFinger }}
              showKeyboard={settings.showKeyboard}
              autoFocus={phase.run > 0}
              onLine={setLineAt}
              onFinish={onFinish}
            />
          )}
        </div>
      </div>
    </div>
  );
}
