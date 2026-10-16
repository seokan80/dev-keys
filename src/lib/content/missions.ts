import { parse } from 'yaml';
import { compare, execute, initialRepo, type RepoState } from '../../core/git';
import { missionSchema, type MissionData } from '../../schemas/mission';
import type { Problem, RawFile } from './check';

export type ContentMission = MissionData & {
  slug: string;
  href: string;
  file: string;
  /** 미션을 시작할 때의 저장소 */
  startState: RepoState;
  /** 권장 풀이를 돌린 결과 = 목표 */
  goalState: RepoState;
};

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** 명령들을 차례로 실행한다. 실패하면 몇 번째 무엇이 왜 실패했는지 */
function runAll(from: RepoState, commands: readonly string[], what: string): RepoState | string {
  let state = from;
  for (const [i, command] of commands.entries()) {
    const r = execute(state, command);
    if (r.error) return `${what} ${i + 1}번째 "${command}" 가 엔진에서 실패: ${r.error.message}`;
    state = r.state;
  }
  return state;
}

/** 미션 YAML 과 해설 파일 목록으로 미션을 만들고 문제를 모은다 (파일 읽기와 분리한 순수 함수) */
export function buildMissions(
  files: RawFile[],
  guidePaths: string[],
): { missions: ContentMission[]; problems: Problem[] } {
  const problems: Problem[] = [];
  const missions: ContentMission[] = [];
  const guides = new Set(guidePaths);

  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    const report = (message: string) => problems.push({ path: file.path, message, level: 'error' });
    const m = /^content\/missions\/([^/]+)\.ya?ml$/.exec(file.path);
    if (!m) {
      report('미션 파일은 content/missions/<슬러그>.yaml 에 둔다');
      continue;
    }
    const slug = m[1]!;
    if (!SLUG.test(slug)) report(`슬러그 "${slug}": 영문 소문자·숫자·하이픈만`);

    let raw: unknown;
    try {
      raw = parse(file.text);
    } catch (e) {
      report(`YAML 문법 오류: ${(e as Error).message.split('\n')[0]}`);
      continue;
    }
    const parsed = missionSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) report(`${issue.path.join('.') || '(최상위)'}: ${issue.message}`);
      continue;
    }
    const data = parsed.data;
    if (data.id !== `mission-${slug}`) report(`id 는 "mission-${slug}" 여야 한다 (지금 "${data.id}")`);
    if (!guides.has(`content/guides/missions/${slug}.md`))
      report(`해설 파일 content/guides/missions/${slug}.md 가 없다`);

    const startState = runAll(initialRepo(), data.start, 'start');
    if (typeof startState === 'string') {
      report(startState);
      continue;
    }
    const goalState = runAll(startState, data.solution, 'solution');
    if (typeof goalState === 'string') {
      report(goalState);
      continue;
    }
    if (compare(goalState, startState, startState).equal)
      report('권장 풀이가 아무것도 바꾸지 않는다 — 목표가 시작과 같다');

    missions.push({ ...data, slug, href: `/git/tree/${slug}`, file: file.path, startState, goalState });
  }

  const seen = new Map<number, string>();
  for (const mission of missions) {
    const first = seen.get(mission.order);
    if (first)
      problems.push({ path: mission.file, message: `order ${mission.order} 이 ${first} 와 겹친다`, level: 'error' });
    else seen.set(mission.order, mission.file);
  }
  missions.sort((a, b) => a.order - b.order);
  return { missions, problems };
}
