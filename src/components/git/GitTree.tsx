import { useLayoutEffect, useRef, useState } from 'react';
import { headBranch, headCommit, reachable, renderText, type RepoState, type TreeLayout } from '@core/git';

const LANE = 58;
const ROW = 42;
const PAD = 26;
const LABEL_H = 18;
/** 글자 폭 어림값 — 그린 뒤 실제 글꼴로 잰 값으로 바꾼다 */
const CHAR_W = 7.3;
const PROBE = 'abcdefghijklmnopqrst';
const GAP = 6;

type Props = {
  state: RepoState;
  layout: TreeLayout;
  /** 바로 앞 레이아웃 — 새로 생긴 커밋을 알아보고 나타나는 움직임을 준다 */
  previous?: TreeLayout;
  /** 어디에서도 닿지 않는 커밋도 흐리게 보여 줄지 (현재 트리는 보이고, 목표 트리는 숨긴다) */
  showOrphans?: boolean;
  /**
   * 커밋 설명(해시 + 메시지). 주면 SourceTree 처럼 커밋은 작은 점, 줄 오른쪽에 이름표와 설명을 놓는다.
   * 없으면 커밋 원 안에 라벨(C1, C2')을 쓴다 (트리 미션)
   */
  names?: Readonly<Record<string, string>>;
  /** 그림 이름 (스크린 리더) */
  title: string;
};

/**
 * 이름표 종류. 엔진에는 원격 · 태그가 없어서, 세트(engine)에서는 origin/… · upstream/… 이름의 브랜치로 원격 브랜치를,
 * tags/… 이름의 브랜치로 태그를 흉내 낸다 — 그림에서는 다르게 그린다 (원격은 점선, 태그는 "tag: …")
 */
type Kind = 'branch' | 'remote' | 'tag';
type Tag = { key: string; text: string; head: boolean; kind: Kind };

const REMOTE = /^(origin|upstream)\//;
const TAG = 'tags/';
const kindOf = (name: string): Kind => (name.startsWith(TAG) ? 'tag' : REMOTE.test(name) ? 'remote' : 'branch');
const KIND_ORDER: Record<Kind, number> = { branch: 0, remote: 1, tag: 2 };
const TAG_STYLE: Record<Kind, { box: string; text: string; dash?: string }> = {
  branch: { box: 'fill-sky-500/15 stroke-sky-500/60', text: 'fill-sky-200' },
  remote: { box: 'fill-slate-500/10 stroke-slate-400/70', text: 'fill-slate-300', dash: '3 2' },
  tag: { box: 'fill-fuchsia-500/15 stroke-fuchsia-400/60', text: 'fill-fuchsia-200' },
};

/**
 * 그림 안 좌표. 최신이 위라서 줄(row)이 클수록 위로 올라간다(y 가 작아진다).
 * 커밋마다 이 좌표는 한 번 정해지면 바뀌지 않고, 줄이 늘면 바깥 그룹(tree-shift)이 통째로 아래로 미끄러진다.
 */
const at = (layout: TreeLayout, id: string) => ({
  x: PAD + layout[id]!.lane * LANE,
  y: -layout[id]!.row * ROW,
});

/**
 * 부모(a, 아래) → 자식(b, 위) 선. SourceTree 처럼:
 * early 면 부모 바로 위에서 꺾어 자식 레인으로 곧게(갈라질 때), 아니면 부모 레인으로 곧게 올라가다 자식 바로 아래에서 꺾는다(합쳐질 때)
 */
function edgePath(a: { x: number; y: number }, b: { x: number; y: number }, early: boolean): string {
  if (a.x === b.x) return `M${a.x} ${a.y}L${b.x} ${b.y}`;
  if (early) {
    const turn = a.y - ROW;
    return `M${a.x} ${a.y}C${a.x} ${a.y - ROW / 2} ${b.x} ${a.y - ROW / 2} ${b.x} ${turn}L${b.x} ${b.y}`;
  }
  const turn = b.y + ROW;
  return `M${a.x} ${a.y}L${a.x} ${turn}C${a.x} ${b.y + ROW / 2} ${b.x} ${b.y + ROW / 2} ${b.x} ${b.y}`;
}

/**
 * 커밋 트리. git log · SourceTree · IntelliJ 처럼 최신이 위, 한 줄에 커밋 하나.
 * 이름표(와 설명)는 모든 레인 오른쪽 칸에 그 커밋의 줄 높이로 나란히 놓는다 — 옆 레인 커밋을 덮지 않게.
 * 이름표가 다른 커밋으로 옮겨 가면 미끄러지듯 움직인다.
 */
export default function GitTree({ state, layout, previous, showOrphans = true, names, title }: Props) {
  // 고정폭 글꼴이라도 기기마다 폭이 달라서, 이름표 상자 · 설명 자리를 실제 글자 폭으로 잡는다
  const probe = useRef<SVGTextElement>(null);
  const [charW, setCharW] = useState(CHAR_W);
  useLayoutEffect(() => {
    const measure = () => {
      const w = probe.current?.getComputedTextLength?.();
      if (w) setCharW(w / PROBE.length);
    };
    measure();
    void document.fonts?.ready.then(measure);
  }, []);
  const tagWidth = (text: string) => text.length * charW + 14;

  const compact = names !== undefined;
  const R = compact ? 7 : 15;
  const live = reachable(state);
  const ids = Object.keys(layout).filter((id) => state.commits[id] && (showOrphans || live.has(id)));
  const current = headBranch(state);
  const head = headCommit(state);

  // 커밋마다 붙는 이름표: HEAD 가 가리키는 브랜치(또는 detached HEAD)가 먼저
  const tags = new Map<string, Tag[]>();
  const push = (id: string, tag: Tag) => tags.set(id, [...(tags.get(id) ?? []), tag]);
  if (current === null) push(head, { key: 'HEAD', text: 'HEAD', head: true, kind: 'branch' });
  // git log 의 꾸밈처럼: HEAD → 지금 브랜치, 다른 브랜치, 원격 브랜치, 태그 순
  const branchNames = Object.keys(state.branches).sort((a, b) =>
    a === current ? -1 : b === current ? 1 : KIND_ORDER[kindOf(a)] - KIND_ORDER[kindOf(b)] || a.localeCompare(b),
  );
  for (const name of branchNames) {
    const kind = kindOf(name);
    push(state.branches[name]!, {
      key: `b:${name}`,
      text: kind === 'tag' ? `tag: ${name.slice(TAG.length)}` : name === current ? `HEAD → ${name}` : name,
      head: name === current,
      kind,
    });
  }

  // 선을 어디서 꺾을지: 첫 부모 선은 자식 레인이 비어 있게 배치했으니(layoutTree) 일찍 꺾는다.
  // 합쳐지는 선은 부모 레인으로 올라가되, 그 사이에 다른 커밋이 있으면 일찍 꺾어 덮지 않게 한다
  const occupied = new Set(ids.map((id) => `${layout[id]!.lane}:${layout[id]!.row}`));
  const early = (parent: string, child: string, first: boolean) => {
    const a = layout[parent]!;
    const b = layout[child]!;
    if (first || b.lane > a.lane) return true;
    for (let row = a.row + 1; row < b.row; row++) if (occupied.has(`${a.lane}:${row}`)) return true;
    return false;
  };

  const maxLane = Math.max(0, ...ids.map((id) => layout[id]!.lane));
  const maxRow = Math.max(0, ...ids.map((id) => layout[id]!.row));
  const labelX = PAD + maxLane * LANE + R + 14;

  // 줄마다: 이름표를 가로로 나란히, 그 뒤에 설명
  const placed: (Tag & { x: number; y: number })[] = [];
  const descriptions: { id: string; x: number; y: number; text: string }[] = [];
  const leads: { id: string; from: { x: number; y: number } }[] = [];
  let widest = 0;
  for (const id of ids) {
    const { y } = at(layout, id);
    let x = labelX;
    const list = tags.get(id) ?? [];
    for (const tag of list) {
      placed.push({ ...tag, x, y });
      x += tagWidth(tag.text) + GAP;
    }
    const text = names?.[id];
    if (text) {
      descriptions.push({ id, x, y, text });
      x += text.length * charW;
    }
    if (list.length > 0 || text) leads.push({ id, from: at(layout, id) });
    widest = Math.max(widest, x - labelX);
  }
  const width = labelX + widest + PAD / 2;
  const height = PAD * 2 + maxRow * ROW + LABEL_H;

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
      <text ref={probe} visibility="hidden" aria-hidden="true">
        {PROBE}
      </text>

      {/* 줄이 늘면 그림 전체가 한 칸 아래로 미끄러지고, 새 커밋은 맨 위에 나타난다 */}
      <g className="tree-shift" style={{ transform: `translate(0px, ${PAD + maxRow * ROW}px)` }}>
        {ids.flatMap((id) =>
          state.commits[id]!.parents.map((p, i) =>
            ids.includes(p) ? (
              <path
                key={`${p}-${id}`}
                d={edgePath(at(layout, p), at(layout, id), early(p, id, i === 0))}
                fill="none"
                className={`tree-fade ${live.has(id) ? 'stroke-slate-500' : 'stroke-slate-700'}`}
                strokeWidth={2}
                strokeDasharray={live.has(id) ? undefined : '4 4'}
              />
            ) : null,
          ),
        )}

        {/* 이름표 · 설명 칸까지 잇는 점선 — 커밋보다 먼저 그려 커밋 아래로 지나가게 */}
        {leads.map(({ id, from }) => (
          <line
            key={`lead:${id}`}
            x1={from.x + R + 2}
            y1={from.y}
            x2={labelX - 3}
            y2={from.y}
            className={id === head ? 'stroke-amber-400/50' : 'stroke-slate-600'}
            strokeDasharray="2 3"
            opacity={live.has(id) ? 1 : 0.4}
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
                {!compact && (
                  <text textAnchor="middle" dominantBaseline="central" className="fill-slate-100">
                    {c.label}
                  </text>
                )}
              </g>
            </g>
          );
        })}

        {descriptions.map((d) => (
          <text
            key={`desc:${d.id}`}
            className={`tree-label ${live.has(d.id) ? 'fill-slate-300' : 'fill-slate-600 line-through'}`}
            style={{ transform: `translate(${d.x}px, ${d.y}px)` }}
            dominantBaseline="central"
          >
            {d.text}
          </text>
        ))}

        {placed.map((tag) => {
          const h = LABEL_H - 2;
          return (
            <g
              key={tag.key}
              className="tree-label"
              style={{ transform: `translate(${tag.x}px, ${tag.y}px)` }}
              data-label={tag.text}
              data-kind={tag.kind}
            >
              <rect
                y={-h / 2}
                width={tagWidth(tag.text)}
                height={h}
                rx={4}
                className={tag.head ? 'fill-amber-500/20 stroke-amber-400' : TAG_STYLE[tag.kind].box}
                strokeDasharray={tag.head ? undefined : TAG_STYLE[tag.kind].dash}
              />
              <text x={6} dominantBaseline="central" className={tag.head ? 'fill-amber-200' : TAG_STYLE[tag.kind].text}>
                {tag.text}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
