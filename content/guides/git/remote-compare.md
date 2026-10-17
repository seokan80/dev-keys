## 앞섬 · 뒤처짐 읽기

| 명령                                                | 보여 주는 것                                 |
| --------------------------------------------------- | -------------------------------------------- |
| `git status -sb`                                    | `[ahead 1, behind 3]` — 한 줄로              |
| `git log --oneline origin/main..`                   | 올릴 것 (원격에 없는 내 커밋). `@{u}..` 로도 |
| `git log --oneline ..origin/main`                   | 받을 것 (내게 없는 원격 커밋)                |
| `git log --oneline --left-right main...origin/main` | 양쪽을 한 번에 — `<` 내 쪽, `>` 원격 쪽      |
| `git diff main...origin/main`                       | 갈라진 뒤 원격 쪽에서 바뀐 것만 (점 셋)      |
| `git diff origin/main -- <파일>`                    | 파일 하나를 원격과 비교                      |

모두 **마지막으로 받아 온** origin/main 기준이다. 먼저 `git fetch`.

## 정리하기

| 상황                                  | 명령                                               |
| ------------------------------------- | -------------------------------------------------- |
| 원격에서 지운 브랜치의 이름표 정리    | `git fetch --prune` (늘 하려면 `fetch.prune true`) |
| 짝이 사라진 로컬 브랜치 찾기          | `git branch -vv` 에서 `: gone]`                    |
| 합쳐진 로컬 브랜치 지우기             | `git branch -d <이름>` — 안 합쳐졌으면 거절해 준다 |
| 원격 브랜치 지우기                    | `git push origin --delete <이름>`                  |
| 지금 원격에 있는 브랜치 (서버에 물음) | `git ls-remote --branches origin`                  |

GitHub 에서 PR 을 합칠 때 "Delete branch" 를 누르거나 저장소 설정에서 "Automatically delete head branches" 를 켜 두면 원격 브랜치는 저절로 지워진다. 로컬 쪽은 `fetch --prune` 과 `branch -d` 로 따라간다.

## clone 이 Windows 에서 실패할 때

다른 OS 에서 만든 저장소에 Windows 가 허락하지 않는 파일 이름(`aux.txt`, `:` 이 든 이름 등)이나 아주 긴 경로가 있으면 clone 이 `error: invalid path` 로 멈춘다.

- 긴 경로: `git config --global core.longpaths true`
- 그 파일이 필요 없다면: `git clone --no-checkout` 뒤 `git sparse-checkout` 으로 빼고 꺼낸다 (5부 "큰 저장소")
- 근본 해결은 저장소에서 이름을 바꾸는 것 — 다른 OS 에서 `git mv`

## 최신 Git

- **2.46 `ls-remote --branches`** — 예전 `--heads` 를 대신한다
- **`@{push}`** — 지금 브랜치를 올릴 곳. 짝과 올릴 곳이 다른 Fork 흐름(4부)에서 `git log @{push}..` 로 아직 안 올린 것을 본다

## AI 에이전트와 쓸 때

- **올리기 전에 무엇이 올라가는지.** 에이전트에게 push 를 맡기기 전 `git log --oneline @{u}..` 나 `git push --dry-run` 결과를 보여 달라고 한다
- **지우기는 사람이.** `git push origin --delete` 는 되돌리기 어렵다. 에이전트 규칙에 "원격 브랜치를 지우지 않는다" 를 둔다
- **에이전트 브랜치 정리.** 합쳐진 에이전트 브랜치는 `fetch --prune` → `git branch -vv` 의 `gone` → `branch -d` 순서로. worktree 를 썼다면 `git worktree remove` 가 먼저다

## 더 읽기

- [git log — 범위 지정](https://git-scm.com/docs/gitrevisions#_specifying_ranges) · [git fetch --prune](https://git-scm.com/docs/git-fetch#_pruning) · [git ls-remote](https://git-scm.com/docs/git-ls-remote)
