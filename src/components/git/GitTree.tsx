import { headBranch, headCommit, reachable, renderText, type RepoState, type TreeLayout } from '@core/git';

const LANE = 58;
const ROW = 54;
const R = 16;
const PAD = 26;
const LABEL_H = 18;
const CHAR_W = 7.3;

type Props = {
  state: RepoState;
  layout: TreeLayout;
  /** 바로 앞 레이아웃 — 새로 생긴 커밋을 알아보고 나타나는 움직임을 준다 */
  previous?: TreeLayout;
  /** 어디에서도 닿지 않는 커밋도 흐리게 보여 줄지 (현재 트리는 보이고, 목표 트리는 숨긴다) */
  showOrphans?: boolean;
  /** 그림 이름 (스크린 리더) */
  title: string;
};

const at = (layout: TreeLayout, id: string) => ({
  x: PAD + layout[id]!.lane * LANE,
  y: PAD + layout[id]!.row * ROW,
});

/**
 * 커밋 트리 (위가 처음, 아래로 쌓인다).
 * 이름표는 모든 레인 오른쪽의 이름표 칸에 그 커밋의 줄 높이로 놓고 점선으로 잇는다 — 옆 레인 커밋을 덮지 않게.
 * 이름표가 다른 커밋으로 옮겨 가면 미끄러지듯 움직인다.
 */
export default function GitTree({ state, layout, previous, showOrphans = true, title }: Props) {
  const live = reachable(state);
  const ids = Object.keys(layout).filter((id) => state.commits[id] && (showOrphans || live.has(id)));
  const current = headBranch(state);
  const head = headCommit(state);

  // 커밋마다 붙는 이름표: HEAD 가 가리키는 브랜치(또는 detached HEAD)가 먼저
  const tags = new Map<string, { key: string; text: string; head: boolean }[]>();
  const push = (id: string, tag: { key: string; text: string; head: boolean }) =>
    tags.set(id, [...(tags.get(id) ?? []), tag]);
  if (current === null) push(head, { key: 'HEAD', text: 'HEAD', head: true });
  for (const name of Object.keys(state.branches).sort((a, b) =>
    a === current ? -1 : b === current ? 1 : a.localeCompare(b),
  )) {
    push(state.branches[name]!, {
      key: `b:${name}`,
      text: name === current ? `HEAD → ${name}` : name,
      head: name === current,
    });
  }

  const maxLane = Math.max(0, ...ids.map((id) => layout[id]!.lane));
  const maxRow = Math.max(0, ...ids.map((id) => layout[id]!.row));
  const longest = Math.max(0, ...[...tags.values()].flat().map((t) => t.text.length));
  const labelX = PAD + maxLane * LANE + R + 14;
  const width = labelX + longest * CHAR_W + 12 + PAD / 2;
  const height = PAD * 2 + maxRow * ROW + LABEL_H;

  // 같은 줄의 이름표를 모아 그 줄 높이를 가운데로 쌓는다 (레인 순서대로)
  const placed: { key: string; text: string; head: boolean; node: { x: number; y: number }; y: number }[] = [];
  const byRow = new Map<number, string[]>();
  for (const id of tags.keys()) {
    if (!layout[id]) continue;
    byRow.set(layout[id].row, [...(byRow.get(layout[id].row) ?? []), id]);
  }
  for (const [row, commitIds] of byRow) {
    const list = commitIds
      .sort((a, b) => layout[a]!.lane - layout[b]!.lane)
      .flatMap((id) => tags.get(id)!.map((tag) => ({ ...tag, node: at(layout, id) })));
    const top = PAD + row * ROW - ((list.length - 1) * LABEL_H) / 2;
    list.forEach((tag, i) => placed.push({ ...tag, y: top + i * LABEL_H }));
  }

  return (
    <svg
      role="img"
      aria-label={title}
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full max-w-full font-mono text-[12px]"
      style={{ maxWidth: width * 1.25 }}
      data-testid="git-tree"
    >
      <title>{title}</title>
      <desc>{renderText(state)}</desc>

      {ids.flatMap((id) =>
        state.commits[id]!.parents.filter((p) => ids.includes(p)).map((p) => {
          const a = at(layout, p);
          const b = at(layout, id);
          const mid = (a.y + b.y) / 2;
          const d =
            a.x === b.x ? `M${a.x} ${a.y}L${b.x} ${b.y}` : `M${a.x} ${a.y}C${a.x} ${mid} ${b.x} ${mid} ${b.x} ${b.y}`;
          return (
            <path
              key={`${p}-${id}`}
              d={d}
              fill="none"
              className={`tree-fade ${live.has(id) ? 'stroke-slate-500' : 'stroke-slate-700'}`}
              strokeWidth={2}
              strokeDasharray={live.has(id) ? undefined : '4 4'}
            />
          );
        }),
      )}

      {/* 이름표까지 잇는 점선 — 커밋보다 먼저 그려 커밋 아래로 지나가게 */}
      {placed.map((tag) => (
        <line
          key={`lead:${tag.key}`}
          x1={tag.node.x + R + 2}
          y1={tag.node.y}
          x2={labelX - 3}
          y2={tag.y}
          className={tag.head ? 'stroke-amber-400/60' : 'stroke-sky-500/50'}
          strokeDasharray="2 3"
        />
      ))}

      {ids.map((id) => {
        const c = state.commits[id]!;
        const { x, y } = at(layout, id);
        const fresh = previous !== undefined && previous[id] === undefined;
        const source = c.origin?.kind === 'copy' && layout[c.origin.of] ? at(layout, c.origin.of) : null;
        const motion = fresh ? (source ? 'tree-copy' : 'tree-pop') : '';
        return (
          <g key={id} transform={`translate(${x} ${y})`} data-commit={c.label}>
            <g
              className={`tree-fade ${motion}`}
              style={
                motion === 'tree-copy'
                  ? ({ '--dx': `${source!.x - x}px`, '--dy': `${source!.y - y}px` } as React.CSSProperties)
                  : undefined
              }
              opacity={live.has(id) ? 1 : 0.35}
            >
              <circle
                r={R}
                className={id === head ? 'fill-amber-500/20 stroke-amber-300' : 'fill-slate-800 stroke-emerald-400'}
                strokeWidth={2}
                strokeDasharray={live.has(id) ? undefined : '3 3'}
              />
              <text textAnchor="middle" dominantBaseline="central" className="fill-slate-100">
                {c.label}
              </text>
            </g>
          </g>
        );
      })}

      {placed.map((tag) => {
        const w = tag.text.length * CHAR_W + 12;
        const h = LABEL_H - 2;
        return (
          <g
            key={tag.key}
            className="tree-label"
            style={{ transform: `translate(${labelX}px, ${tag.y}px)` }}
            data-label={tag.text}
          >
            <rect
              y={-h / 2}
              width={w}
              height={h}
              rx={4}
              className={tag.head ? 'fill-amber-500/20 stroke-amber-400' : 'fill-sky-500/15 stroke-sky-500/60'}
            />
            <text x={6} dominantBaseline="central" className={tag.head ? 'fill-amber-200' : 'fill-sky-200'}>
              {tag.text}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
