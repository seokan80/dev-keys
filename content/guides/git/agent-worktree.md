## 왜 작업마다 worktree 인가

AI 에이전트는 파일을 직접 고친다. 에이전트 둘이 같은 폴더에서 일하면 서로의 변경을 덮어쓰고, 그동안 나는 내 작업을 할 수 없다. `stash` 와 `switch` 로 오가면 누가 무엇을 바꿨는지 섞인다.

**worktree** 는 저장소(커밋 · 브랜치) 하나에 작업 폴더를 여러 개 여는 기능이다. 에이전트마다 폴더와 브랜치를 하나씩 주면:

- 파일이 섞이지 않는다 — 각자 자기 폴더에서만 고친다
- 내 폴더(`~/devkeys`)는 그대로다 — 하던 일 · 실행 중인 서버가 멈추지 않는다
- 결과는 브랜치로 남는다 — 검토하고 합치거나 버리기만 하면 된다

## 흐름

| 단계      | 명령                                                                                               |
| --------- | -------------------------------------------------------------------------------------------------- |
| 맡기기    | `git worktree add ../devkeys-search -b agent/search` (기준을 정하려면 끝에 `main` · `origin/main`) |
| 일 시키기 | 에이전트를 그 폴더(`../devkeys-search`)에서 연다                                                   |
| 보기      | `git worktree list` · `git branch -v` (`+` 는 다른 worktree 에서 쓰는 브랜치)                      |
| 검토      | `git diff main...agent/search` · `git log -p main..agent/search`                                   |
| 합치기    | `git merge agent/search` (팀이면 PR 로 — 4부)                                                      |
| 정리      | `git worktree remove ../devkeys-search` → `git branch -d agent/search`                             |

이름은 폴더 `../<저장소>-<작업>`, 브랜치 `agent/<작업>` 처럼 맞춰 두면 목록만 보고도 무엇을 맡겼는지 안다. 이슈 번호를 쓰는 팀이면 `<번호>-<짧은 이름>` (DevKeys 도 이 규칙이다).

## 정리하는 습관

- **합치면 바로 지운다.** `git worktree list` 에는 진행 중인 것만 남긴다. 쌓이면 무엇이 끝났는지 알 수 없다
- 지우기 전에 확인: 고친 채 남은 파일이 있으면 `remove` 가 거부한다. 정말 필요 없을 때만 `--force`
- 폴더를 파일 관리자로 그냥 지웠다면 `git worktree prune` 으로 기록을 정리한다
- 그 폴더에서 띄운 시험 서버 · 감시 프로세스는 먼저 끈다
- 같은 브랜치는 두 worktree 에서 동시에 열 수 없다 — 에이전트 둘에게 같은 브랜치를 주지 않는다

## 알아 둘 것

- **의존성은 폴더마다.** `node_modules` 같은 것은 worktree 마다 새로 설치한다 (디스크 · 시간)
- **무시된 파일은 따라오지 않는다.** `.env` 처럼 `.gitignore` 에 있는 파일은 새 폴더에 없다. 필요한 것만 복사해 준다
- 오래 걸리는 작업이면 `git worktree lock` 으로 실수로 정리되지 않게 잠가 둘 수 있다

## 최신 Git

- **2.48 `--relative-paths`** — `git worktree add --relative-paths` 나 `worktree.useRelativePaths` 를 켜면 저장소 폴더를 옮겨도 worktree 연결이 깨지지 않는다. 컨테이너 · 다른 경로에서 같은 저장소를 열 때 편하다
- **`git worktree add --orphan`** — 기록이 없는 새 브랜치로 폴더를 연다 (문서 사이트 브랜치처럼 완전히 다른 내용일 때)

## AI 에이전트와 쓸 때

- 맡길 때 **폴더 · 브랜치 이름과 "끝나면 지울 것"까지** 알려 준다. 에이전트가 새로 만든 worktree 도 합쳐지면 내가 정리한다
- 에이전트 도구 중에는 작업마다 worktree 를 알아서 만들어 주는 것도 있다. 편하지만 `git worktree list` 로 쌓인 것이 없는지는 직접 본다
- 에이전트가 끝내면 합치기 전에 **반드시 diff 를 본다.** 다음 세트 "AI 변경 검토"에서 골라 담는 법을 다룬다

## 더 읽기

- [git worktree](https://git-scm.com/docs/git-worktree) · [git branch](https://git-scm.com/docs/git-branch)
