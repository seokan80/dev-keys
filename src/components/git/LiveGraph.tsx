import { useState } from 'react';
import type { TreeLayout } from '@core/git';
import type { SetGraph } from '../../lib/content/check';
import GitTree from './GitTree';

type Props = {
  graph: SetGraph;
  /** 보여 줄 단계 */
  step: number;
};

/** 그 단계에 있는 커밋만 남긴 배치 — 바로 앞 단계와 비교해 새 커밋이 튀어나오게 한다 */
const pick = (layout: TreeLayout, graph: SetGraph, step: number): TreeLayout =>
  Object.fromEntries(Object.entries(layout).filter(([id]) => graph.steps[step]!.commits[id]));

/**
 * 오른쪽 칸의 커밋 그래프. 줄을 끝낼 때마다 그 명령 뒤 상태로 바뀌고,
 * 새 커밋은 튀어나오고 이름표는 미끄러지듯 옮겨 가며 버린 커밋은 흐려진다
 */
export default function LiveGraph({ graph, step }: Props) {
  // 바로 앞에 보여 준 단계 (움직임의 출발점)
  const [shown, setShown] = useState<{ step: number; previous: number | null }>({ step, previous: null });
  if (shown.step !== step) setShown({ step, previous: shown.step });
  const previous = shown.previous === null ? undefined : pick(graph.layout, graph, shown.previous);

  return (
    <section className="flex flex-col gap-2" data-testid="live-graph" data-step={step}>
      <h2 className="text-xs font-bold tracking-wide text-sky-300">커밋 그래프</h2>
      <div className="max-h-72 overflow-auto lg:max-h-[50dvh]">
        <GitTree
          state={graph.steps[step]!}
          layout={graph.layout}
          previous={previous}
          names={graph.names}
          title="커밋 그래프"
        />
      </div>
    </section>
  );
}
