import type { Scene, SceneZone } from '../../schemas/set';

const ZONES: { id: SceneZone; title: string; hint: string }[] = [
  { id: 'workdir', title: '작업 트리', hint: '고친 것' },
  { id: 'staged', title: '스테이징', hint: '커밋할 것' },
  { id: 'repo', title: '저장소', hint: '커밋 기록' },
];
type Props = {
  scene: Scene;
  /** 바로 앞 그림 — 새로 생긴 표를 강조하려고 */
  previous: Scene | null;
  /** HEAD 가 가리키는 브랜치 */
  branch?: string;
  /** 보여 줄 칸 (커밋 그래프가 있으면 저장소 칸은 그래프가 대신한다) */
  zones?: readonly SceneZone[];
};

/** 칸 사이 화살표. 칸 가운데에서 가운데로 그린다 (n 칸 중 a 번째 → b 번째) */
function Arrow({ a, b, n, label, both }: { a: number; b: number; n: number; label?: string; both?: boolean }) {
  const left = Math.min(a, b);
  const span = Math.abs(b - a);
  const toRight = b > a;
  const color = both ? 'bg-amber-400' : 'bg-sky-400';
  const head = (side: 'left' | 'right') => (
    <span
      className={`absolute top-1/2 size-0 -translate-y-1/2 border-y-[6px] border-y-transparent ${
        side === 'right'
          ? `-right-1 border-l-[9px] ${both ? 'border-l-amber-400' : 'border-l-sky-400'}`
          : `-left-1 border-r-[9px] ${both ? 'border-r-amber-400' : 'border-r-sky-400'}`
      }`}
    />
  );
  return (
    <div className="relative h-10" aria-hidden="true">
      <div
        className={`absolute top-6 h-0.5 ${color} ${toRight ? 'scene-grow-right' : 'scene-grow-left'}`}
        style={{ left: `${((2 * left + 1) / (2 * n)) * 100}%`, width: `${((2 * span) / (2 * n)) * 100}%` }}
      >
        {(both || toRight) && head('right')}
        {(both || !toRight) && head('left')}
      </div>
      {label && (
        <span
          className={`absolute top-0 -translate-x-1/2 font-mono text-xs ${both ? 'text-amber-300' : 'text-sky-300'}`}
          style={{ left: `${((2 * left + 1 + span) / (2 * n)) * 100}%` }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

/** 칸 사이 움직임: 두 칸이 모두 보이면 화살표, 한쪽이 숨은 칸(그래프가 대신하는 저장소)이면 글로 */
function Move({
  from,
  to,
  label,
  both,
  shown,
}: {
  from: SceneZone;
  to: SceneZone;
  label?: string;
  both?: boolean;
  shown: readonly SceneZone[];
}) {
  const a = shown.indexOf(from);
  const b = shown.indexOf(to);
  if (a !== -1 && b !== -1) return <Arrow a={a} b={b} n={shown.length} label={label} both={both} />;
  const name = (z: SceneZone) => (shown.includes(z) ? ZONES.find((x) => x.id === z)!.title : '커밋 그래프');
  return (
    <p className="mt-2 font-mono text-xs text-sky-300">
      {label ? `${label}: ` : ''}
      {name(from)} → {name(to)}
    </p>
  );
}

/** Git 세 칸 그림: 작업 트리 · 스테이징 · 저장소와, 무엇이 어디로 옮겨 갔는지 (오른쪽 칸에 늘 보인다) */
export default function GitScene({ scene, previous, branch = 'main', zones = ['workdir', 'staged', 'repo'] }: Props) {
  const shown = ZONES.filter((z) => zones.includes(z.id));
  const active = new Set<SceneZone>([
    ...(scene.arrow ? [scene.arrow.from, scene.arrow.to] : []),
    ...(scene.compare ?? []),
  ]);
  const firstLiveCommit = scene.repo.find((c) => !c.startsWith('~'));

  return (
    <div className="font-sans text-sm" data-testid="scene">
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))` }}>
        {shown.map((zone) => {
          const chips = scene[zone.id];
          const before = previous?.[zone.id] ?? [];
          const border = scene.compare?.includes(zone.id)
            ? 'border-amber-400/70'
            : active.has(zone.id)
              ? 'border-sky-500/70'
              : 'border-slate-700';
          return (
            <div key={zone.id} className={`flex min-h-20 flex-col gap-2 rounded-md border p-2 ${border}`}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-bold text-slate-200">{zone.title}</span>
                {shown.length < 3 && <span className="text-slate-500">{zone.hint}</span>}
              </div>
              {chips.length === 0 ? (
                <span className="text-xs text-slate-600">비어 있음</span>
              ) : (
                <ul className="flex flex-col gap-1">
                  {chips.map((chip) => {
                    const gone = chip.startsWith('~');
                    const text = gone ? chip.slice(1) : chip;
                    const fresh = !gone && !before.includes(chip);
                    return (
                      <li
                        key={chip}
                        className={`flex flex-wrap items-baseline justify-between gap-x-2 rounded bg-slate-800 px-2 py-1 font-mono text-xs ${
                          gone ? 'text-slate-500 line-through' : fresh ? 'scene-pop ring-2 ring-sky-400' : ''
                        }`}
                      >
                        <span className="break-words">{text}</span>
                        {zone.id === 'repo' && chip === firstLiveCommit && (
                          <span className="shrink-0 text-emerald-400">HEAD → {branch}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      {scene.arrow && (
        <Move from={scene.arrow.from} to={scene.arrow.to} label={scene.arrow.label} shown={shown.map((z) => z.id)} />
      )}
      {scene.compare && (
        <Move from={scene.compare[0]} to={scene.compare[1]} label="비교" both shown={shown.map((z) => z.id)} />
      )}
    </div>
  );
}
