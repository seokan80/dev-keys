import { useState } from 'react';
import type { TreeLayout } from '@core/git';
import type { SetGraph } from '../../lib/content/check';
import GitTree from './GitTree';

type Props = {
  graph: SetGraph;
  /** 보여 줄 단계 */
  step: number;
  /** 방금 끝낸 명령과 그 설명 (아직 없으면 null) */
  last: { command: string; caption: string | null } | null;
};

/** 그 단계에 있는 커밋만 남긴 배치 — 바로 앞 단계와 비교해 새 커밋이 튀어나오게 한다 */
const pick = (layout: TreeLayout, graph: SetGraph, step: number): TreeLayout =>
  Object.fromEntries(Object.entries(layout).filter(([id]) => graph.steps[step]!.commits[id]));

/**
 * 타자 영역 옆에 늘 보이는 커밋 그래프. 줄을 끝낼 때마다 그 명령 뒤 상태로 바뀌고,
 * 새 커밋은 튀어나오고 이름표는 미끄러지듯 옮겨 가며 버린 커밋은 흐려진다
 */
export default function LiveGraph({ graph, step, last }: Props) {
  // 바로 앞에 보여 준 단계 (움직임의 출발점)
  const [shown, setShown] = useState<{ step: number; previous: number | null }>({ step, previous: null });
  if (shown.step !== step) setShown({ step, previous: shown.step });
  const previous = shown.previous === null ? undefined : pick(graph.layout, graph, shown.previous);

  return (
    <figure
      className="flex flex-col gap-2 rounded-lg border border-sky-900 bg-slate-950/70 p-3 text-sm"
      data-testid="live-graph"
      data-step={step}
    >
      <figcaption className="text-xs font-bold tracking-wide text-sky-300">커밋 그래프</figcaption>
      <div className="max-h-72 overflow-auto lg:max-h-[60dvh]">
        <GitTree
          state={graph.steps[step]!}
          layout={graph.layout}
          previous={previous}
          names={graph.names}
          title="커밋 그래프"
        />
      </div>
      <div className="min-h-10 border-t border-slate-800 pt-2" aria-live="polite" data-testid="graph-caption">
        {last ? (
          <>
            <code className="block truncate font-mono text-xs text-slate-400">$ {last.command}</code>
            {last.caption && <p className="text-sky-200">{last.caption}</p>}
          </>
        ) : (
          <p className="text-slate-500">명령을 치면 그래프가 바뀐다</p>
        )}
      </div>
    </figure>
  );
}
