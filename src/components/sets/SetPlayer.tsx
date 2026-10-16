import { useState } from 'react';
import { bestKey, recordBest, setLastPlayed, updateSettings, type Best, type Settings } from '@core/storage';
import type { TypingStats } from '@core/typing';
import type { CodeLine } from '../../lib/content/check';
import { updateSave, useSave } from '../../lib/save';
import GitScene from '../scenes/GitScene';
import TreeSceneView from '../scenes/TreeSceneView';
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
};

type Phase =
  | { kind: 'typing'; run: number }
  | { kind: 'result'; run: number; stats: TypingStats; improved: boolean; previous: Best | null };

/** 기본 모드 한 세트: 설정 · 최고 기록 · 따라치기 · 결과 */
export default function SetPlayer({ setId, href, lines, next, commentMark, prompt, outputMark, guideHref }: Props) {
  const save = useSave();
  const [phase, setPhase] = useState<Phase>({ kind: 'typing', run: 0 });
  const key = bestKey(setId, 'copy');
  const best = save.bests[key];
  const { settings } = save;

  const change = (patch: Partial<Settings>) => updateSave((s) => updateSettings(s, patch));
  const hasScenes = lines.some((l) => l.scene !== null || l.tree !== null);
  const previousScene = (i: number) => {
    for (let k = i - 1; k >= 0; k--) if (lines[k]!.scene) return lines[k]!.scene;
    return null;
  };

  const onFinish = (stats: TypingStats) => {
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
        <div className="flex flex-wrap gap-4 text-slate-300">
          {hasScenes && (
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={settings.showScenes}
                onChange={(e) => change({ showScenes: e.target.checked })}
              />
              그림 보기
            </label>
          )}
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={settings.autoIndent}
              onChange={(e) => change({ autoIndent: e.target.checked })}
            />
            들여쓰기 자동 입력
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={settings.showKeyboard}
              onChange={(e) => change({ showKeyboard: e.target.checked })}
            />
            키보드 보기
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={settings.sixFinger === 'left'}
              onChange={(e) => change({ sixFinger: e.target.checked ? 'left' : 'right' })}
            />
            숫자 6을 왼손 검지로
          </label>
        </div>
      </div>

      {phase.kind === 'result' ? (
        <ResultScreen
          stats={phase.stats}
          improved={phase.improved}
          previous={phase.previous}
          next={next}
          guideHref={guideHref}
          onRetry={() => setPhase({ kind: 'typing', run: phase.run + 1 })}
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
          outputMark={outputMark}
          pauseAfter={lines.map((l) => settings.showScenes && (l.scene !== null || l.tree !== null))}
          renderScene={(i) =>
            lines[i]!.tree ? (
              <TreeSceneView tree={lines[i]!.tree!} />
            ) : (
              <GitScene scene={lines[i]!.scene!} previous={previousScene(i)} />
            )
          }
          typingOptions={{ autoIndent: settings.autoIndent }}
          keyboardOptions={{ sixFinger: settings.sixFinger }}
          showKeyboard={settings.showKeyboard}
          autoFocus={phase.run > 0}
          onFinish={onFinish}
        />
      )}
    </div>
  );
}
