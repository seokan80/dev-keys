/** HEAD: 브랜치를 가리키거나(보통), 커밋을 바로 가리킨다(detached) */
export type Head = { type: 'branch'; name: string } | { type: 'detached'; commit: string };

export type Commit = Readonly<{
  /** 내부 id: 'c1', 'c2' … (만든 순서) */
  id: string;
  /** 화면·명령용 이름: 'C1', 복사본은 "C3'", "C3''" */
  label: string;
  /** [0] = 첫 부모. 머지 커밋은 둘 */
  parents: readonly string[];
  /** 복사(rebase · cherry-pick)나 되돌림(revert)으로 생긴 커밋. 복사의 of 는 최초 원본 */
  origin?: { kind: 'copy' | 'revert'; of: string };
  message?: string;
}>;

export type RepoState = Readonly<{
  commits: Readonly<Record<string, Commit>>;
  /** 브랜치 이름 → 커밋 id */
  branches: Readonly<Record<string, string>>;
  head: Head;
  /** 바로 전 HEAD (switch - / checkout -) */
  previous?: Head;
  /** 다음 커밋 번호 */
  seq: number;
}>;

/** 그림(애니메이션)용 사건 */
export type GitEvent =
  | { type: 'commit'; id: string }
  | { type: 'copy'; from: string; to: string }
  /** from 이 null 이면 새로 만듦, to 가 null 이면 지움 */
  | { type: 'branch'; name: string; from: string | null; to: string | null }
  | { type: 'head'; from: Head; to: Head }
  /** 어느 브랜치 · HEAD 에서도 닿지 않게 된 커밋 */
  | { type: 'orphaned'; ids: string[] };

export type ResetMode = 'soft' | 'mixed' | 'hard';

/** message: 실제 git 과 비슷한 문구, hint: 한 줄 한국어 설명 */
export type GitError = { message: string; hint: string };

export type ExecResult = {
  state: RepoState;
  events: GitEvent[];
  /** 실제 git 이 찍을 법한 출력. 없으면 '' */
  output: string;
  error: GitError | null;
  /** 명령 이름, reset 모드 (동의어 판정용 — 스테이징이 없어 soft/hard 결과 상태가 같다) */
  info: { command: string; resetMode?: ResetMode };
};
