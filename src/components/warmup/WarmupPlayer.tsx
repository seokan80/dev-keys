import { fingerDrill } from '@core/keyboard';
import type { CodeLine } from '../../lib/content/check';
import { useSave } from '../../lib/save';
import type { NextSet } from '../sets/NextSetCard';
import SetPlayer from '../sets/SetPlayer';

/** 손가락 풀기: 숫자 6 설정에 맞춰 연습 줄을 만들어 세트처럼 친다 */
export default function WarmupPlayer({ next }: { next: NextSet | null }) {
  const { settings } = useSave();
  const lines: CodeLine[] = fingerDrill({ sixFinger: settings.sixFinger }).flatMap((stage) =>
    stage.lines.map((line) => ({
      text: line.text,
      comments: line.comment ? [line.comment] : [],
      output: null,
      scene: null,
      tree: null,
      itemId: stage.finger,
    })),
  );
  return <SetPlayer setId="warmup" href="/warmup" lines={lines} next={next} commentMark="#" />;
}
