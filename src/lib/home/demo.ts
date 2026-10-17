// 메인 첫 화면의 "바로 쳐 보기" — 명령 몇 줄과, 줄마다 바뀌는 커밋 그래프
import { execute, initialRepo, layoutTree, type RepoState } from '../../core/git';
import type { SetGraph } from '../content/check';

/** 치는 줄과 줄 위 해설: 브랜치를 만들어 커밋하고 main 에 합치기까지 */
export const DEMO_LINES = [
  { text: 'git switch -c feature/search', note: '브랜치를 만들고 옮겨 간다' },
  { text: 'git commit -m "feat: add search box"', note: '검색창을 커밋한다 — 옆 그래프에 커밋이 생긴다' },
  { text: 'git switch main', note: 'main 으로 돌아온다' },
  { text: 'git merge --no-ff feature/search', note: '합친다 — 갈라졌다 합쳐진 모양' },
] as const;

/** 명령을 엔진으로 차례로 돌려 단계마다의 상태와 한 번 정한 배치를 만든다 (빌드 때). 0단계는 시작 상태 */
export function demoGraph(root: string, commands: readonly string[]): SetGraph {
  let state: RepoState = initialRepo();
  let layout = layoutTree(state);
  const steps: RepoState[] = [state];
  const names: Record<string, string> = { c1: root };
  for (const command of commands) {
    const r = execute(state, command);
    if (r.error) throw new Error(`메인 데모 "${command}": ${r.error.message}`);
    for (const [id, c] of Object.entries(r.state.commits)) if (!state.commits[id]) names[id] = c.message ?? c.label;
    state = r.state;
    layout = layoutTree(state, layout);
    steps.push(state);
  }
  return { steps, layout, names };
}
