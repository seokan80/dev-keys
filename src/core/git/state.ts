import { bySeq, headCommit, reachable } from './graph';
import type { Commit, GitEvent, Head, RepoState } from './types';

/** 시작 저장소: main 브랜치에 커밋 C1 하나 */
export function initialRepo(): RepoState {
  return {
    commits: { c1: { id: 'c1', label: 'C1', parents: [] } },
    branches: { main: 'c1' },
    head: { type: 'branch', name: 'main' },
    seq: 2,
  };
}

/** 명령 하나가 상태를 바꾸는 동안 쓰는 작업 공간. 끝나면 새 상태와 사건 목록을 돌려준다 */
export class Tx {
  readonly events: GitEvent[] = [];
  private commits: Record<string, Commit>;
  private branches: Record<string, string>;
  private head: Head;
  private previous: Head | undefined;
  private seq: number;

  constructor(private readonly before: RepoState) {
    this.commits = { ...before.commits };
    this.branches = { ...before.branches };
    this.head = before.head;
    this.previous = before.previous;
    this.seq = before.seq;
  }

  /** 지금까지 바꾼 것을 반영한 상태 (중간에 읽기용) */
  get state(): RepoState {
    return {
      commits: this.commits,
      branches: this.branches,
      head: this.head,
      ...(this.previous ? { previous: this.previous } : {}),
      seq: this.seq,
    };
  }

  /** 새 커밋. 복사본이면 원본 라벨에 ' 를 붙인다 */
  addCommit(parents: string[], options: { message?: string; copyOf?: string; revertOf?: string } = {}): string {
    const id = `c${this.seq}`;
    const source = options.copyOf ? this.commits[options.copyOf]! : null;
    const commit: Commit = {
      id,
      label: source ? `${source.label}'` : `C${this.seq}`,
      parents,
      ...(source
        ? { origin: { kind: 'copy' as const, of: source.origin?.kind === 'copy' ? source.origin.of : source.id } }
        : options.revertOf
          ? { origin: { kind: 'revert' as const, of: options.revertOf } }
          : {}),
      ...(options.message !== undefined ? { message: options.message } : {}),
    };
    this.commits[id] = commit;
    this.seq += 1;
    this.events.push(source ? { type: 'copy', from: source.id, to: id } : { type: 'commit', id });
    return id;
  }

  setBranch(name: string, to: string | null) {
    const from = this.branches[name] ?? null;
    if (from === to) return;
    if (to === null) delete this.branches[name];
    else this.branches[name] = to;
    this.events.push({ type: 'branch', name, from, to });
  }

  setHead(to: Head) {
    const from = this.head;
    if (JSON.stringify(from) === JSON.stringify(to)) return;
    this.previous = from;
    this.head = to;
    this.events.push({ type: 'head', from, to });
  }

  /** HEAD 가 가리키는 쪽을 옮긴다: 브랜치면 그 브랜치를, detached 면 HEAD 를 */
  moveHead(to: string) {
    if (this.head.type === 'branch') this.setBranch(this.head.name, to);
    else {
      const from = this.head;
      this.head = { type: 'detached', commit: to };
      this.events.push({ type: 'head', from, to: this.head });
    }
  }

  renameBranch(from: string, to: string) {
    const id = this.branches[from]!;
    delete this.branches[from];
    this.branches[to] = id;
    this.events.push(
      { type: 'branch', name: from, from: id, to: null },
      { type: 'branch', name: to, from: null, to: id },
    );
    if (this.head.type === 'branch' && this.head.name === from) this.head = { type: 'branch', name: to };
  }

  /** 끝: 어디에서도 닿지 않게 된 커밋을 알린다 */
  finish(): { state: RepoState; events: GitEvent[] } {
    const after = this.state;
    const now = reachable(after);
    const lost = [...reachable(this.before)].filter((id) => !now.has(id)).sort(bySeq);
    if (lost.length > 0) this.events.push({ type: 'orphaned', ids: lost });
    return { state: after, events: this.events };
  }

  headCommit() {
    return headCommit(this.state);
  }
}
