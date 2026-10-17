import { useEffect, useState } from 'react';
import type { SetGraph } from '../../lib/content/check';
import LiveGraph from '../git/LiveGraph';
import TypingArea from '../typing/TypingArea';

type Props = {
  lines: readonly { text: string; note: string }[];
  graph: SetGraph;
  /** 다 치고 나서 이어 갈 곳 (Git 첫 세트) */
  startHref: string;
  /** Git 세트 수 */
  setCount: number;
};

/**
 * 메인 첫 화면: 명령 몇 줄을 바로 쳐 보면 옆 커밋 그래프가 움직인다. 페이지 어디서든 키를 누르면 시작한다.
 * 키보드가 없는 기기(터치)에서는 칠 수 없으니 줄을 차례로 짚으며 그래프를 저절로 돌려 보여 준다
 */
export default function HeroDemo({ lines, graph, startHref, setCount }: Props) {
  const [touch] = useState(() => window.matchMedia('(pointer: coarse)').matches);
  const [lineAt, setLineAt] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!touch) return;
    const id = setInterval(() => setLineAt((at) => (at >= lines.length ? 0 : at + 1)), 1600);
    return () => clearInterval(id);
  }, [touch, lines.length]);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]" data-testid="hero-demo">
      <div className="flex min-w-0 flex-col gap-3">
        {touch ? (
          <>
            <ol className="flex flex-col gap-1 rounded-lg border border-slate-700 bg-slate-900 p-4 font-mono text-sm">
              {lines.map((line, i) => (
                <li
                  key={line.text}
                  className={i < lineAt ? 'text-emerald-300' : i === lineAt ? 'text-slate-100' : 'text-slate-500'}
                >
                  <span className="text-slate-500">$ </span>
                  {line.text}
                </li>
              ))}
            </ol>
            <p className="text-sm text-amber-200">
              키보드가 있는 컴퓨터에서 직접 쳐 보세요 — 지금은 자동으로 보여 드려요.
            </p>
          </>
        ) : (
          <TypingArea
            lines={lines.map((l) => l.text)}
            comments={lines.map((l) => [l.note])}
            commentMark="#"
            prompt="$"
            showKeyboard={false}
            onLine={setLineAt}
            onFinish={() => setDone(true)}
          />
        )}
        {done && (
          <p
            className="rounded-lg border border-emerald-600/60 bg-emerald-500/10 p-4 text-emerald-200"
            data-testid="demo-done"
          >
            방금 브랜치를 만들어 합쳤어요. 이렇게 치면서 익히는 세트가 {setCount}개 있어요 —{' '}
            <a href={startHref} className="font-bold underline">
              1부부터 시작 →
            </a>
          </p>
        )}
      </div>
      <div className="rounded-lg border border-sky-800/60 bg-slate-950/40 p-3">
        <LiveGraph graph={graph} step={lineAt} />
      </div>
    </div>
  );
}
