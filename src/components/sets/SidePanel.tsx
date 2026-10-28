import type { SetGraph } from '../../lib/content/check';
import type { Scene } from '../../schemas/set';
import type { FileState } from '../../schemas/set';
import FileTree from '../shell/FileTree';
import LiveGraph from '../git/LiveGraph';
import GitScene from '../scenes/GitScene';

type Props = {
  fileState?: FileState | null;
  previousFiles?: FileState | null;
  /** 지금 상태 그림 (방금까지 끝낸 줄 중 마지막 그림) */
  scene: Scene | null;
  /** 그 앞 그림 — 새로 생긴 표를 강조하려고 */
  previousScene: Scene | null;
  graph: SetGraph | null;
  /** 커밋 그래프 단계 */
  step: number;
  /** 방금 친 명령과 그 줄의 설명들 */
  last: { command: string; captions: string[] } | null;
};

/**
 * 타자 영역 옆에 늘 보이는 Git 상태: 상태 그림(작업 트리 · 스테이징 · 저장소) + 커밋 그래프 + 방금 친 명령.
 * 커밋 그래프가 있으면 저장소 칸은 그래프가 대신한다
 */
export default function SidePanel({
  fileState = null,
  previousFiles = null,
  scene,
  previousScene,
  graph,
  step,
  last,
}: Props) {
  return (
    <aside
      className="flex flex-col gap-3 rounded-lg border border-sky-900 bg-slate-950/70 p-3 text-sm"
      data-testid="side-panel"
    >
      {fileState && <FileTree state={fileState} previous={previousFiles} />}
      {scene && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-bold tracking-wide text-sky-300">파일 상태</h2>
          <GitScene
            scene={scene}
            previous={previousScene}
            zones={graph ? ['workdir', 'staged'] : ['workdir', 'staged', 'repo']}
          />
        </section>
      )}
      {graph && <LiveGraph graph={graph} step={step} />}
      <div className="min-h-10 border-t border-slate-800 pt-2" aria-live="polite" data-testid="graph-caption">
        {last ? (
          <>
            <code className="block truncate font-mono text-xs text-slate-400">$ {last.command}</code>
            {last.captions.map((c) => (
              <p key={c} className="text-sky-200">
                {c}
              </p>
            ))}
          </>
        ) : (
          <p className="text-slate-400">명령을 치면 여기 상태가 바뀐다</p>
        )}
      </div>
    </aside>
  );
}
