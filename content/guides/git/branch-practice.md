## 두 브랜치 비교: 점 두 개 · 점 세 개

| 명령                      | 보여 주는 것                                                            |
| ------------------------- | ----------------------------------------------------------------------- |
| `git log main..feature`   | feature 에만 있는 커밋 (main 에 합치면 들어갈 것)                       |
| `git log main...feature`  | 한쪽에만 있는 커밋 모두. `--left-right` 를 더하면 어느 쪽인지 `<` `>`   |
| `git diff main feature`   | 두 끝을 그대로 비교 (`main..feature` 와 같다)                           |
| `git diff main...feature` | 갈라진 뒤 feature 에서 바뀐 것만 — GitHub PR 의 "Files changed" 와 같다 |

`main` 이 그 사이 앞으로 갔다면 점 두 개 diff 에는 main 쪽 변경까지 거꾸로 섞여 보인다. 리뷰할 때는 점 세 개.

## 잘못된 브랜치에 커밋했을 때

| 상황                       | 방법                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------- |
| 옮겨 갈 브랜치가 이미 있다 | 그 브랜치에서 `git cherry-pick main` → main 에서 `git reset --hard HEAD~1` (이번 세트) |
| 새 브랜치로 빼고 싶다      | `git branch feature/x` (지금 커밋에 이름표만) → `git reset --hard HEAD~1`              |
| 이미 push 했다             | main 에서는 `git revert`, 옮길 브랜치에서 `git cherry-pick`                            |

- 여러 개를 옮길 때: `git cherry-pick A..B` (A 다음부터 B 까지). 충돌이 나면 고친 뒤 `--continue`, 그만두려면 `--abort`
- `-x` 를 붙이면 메시지에 `(cherry picked from commit …)` 이 남는다. 릴리스 브랜치로 수정을 옮기는 백포트에서 쓰는 관례 (4부)

## worktree — 브랜치마다 폴더 하나

`stash` 하고 `switch` 하는 대신 폴더를 하나 더 연다. 빌드 결과 · 실행 중인 서버 · 편집기 상태가 그대로 남는다.

- 새 브랜치로: `git worktree add ../폴더 -b 브랜치` · 있는 브랜치로: `git worktree add ../폴더 브랜치`
- 커밋 · 브랜치 · 설정은 함께 쓰고, 작업 트리와 스테이징만 따로다
- 같은 브랜치를 두 폴더에서 동시에 열 수는 없다
- 다 쓰면 `git worktree remove ../폴더`. 폴더를 그냥 지워 버렸다면 `git worktree prune`
- 열어 둔 것은 `git worktree list` 로 확인한다 — 쌓아 두지 말고 합친 뒤 바로 지운다

## stash 심화

| 하는 일                          | 명령                                     |
| -------------------------------- | ---------------------------------------- |
| 새 파일까지, 이름 붙여 치우기    | `git stash push -u -m "이름"`            |
| 스테이징한 것만 치우기           | `git stash push --staged`                |
| 골라서 치우기                    | `git stash push -p`                      |
| 무엇이 들었나                    | `git stash show --stat -u` · 내용은 `-p` |
| 꺼내고 목록에서 지우기 / 남기기  | `git stash pop` / `git stash apply`      |
| 꺼내지 않고 지우기 / 모두 지우기 | `git stash drop` / `git stash clear`     |
| 치운 것을 새 브랜치로 꺼내기     | `git stash branch 새브랜치`              |

stash 는 오래 두면 무엇이었는지 잊는다. 하루 넘게 둘 일이면 브랜치를 만들어 커밋하는 편이 낫다.

## 최신 Git

- **2.35 `git stash push --staged`** — 스테이징한 것만 치운다
- **2.51 `git stash export` / `import`** — stash 를 커밋처럼 ref 로 내보내 push 하고 다른 컴퓨터에서 가져올 수 있다
- **2.55 `git checkout -m`** — 충돌하는 변경이 있어도 알아서 stash 해 두고 브랜치를 옮긴다

## AI 에이전트와 쓸 때

- **에이전트마다 worktree 하나.** 같은 저장소에서 에이전트 여럿이 동시에 일해도 파일이 섞이지 않고, 내가 쓰던 폴더도 그대로다. 5부 "에이전트 작업 격리"에서 자세히 다룬다
- **에이전트가 main 에 바로 커밋해 버렸다면** — 이번 세트처럼 cherry-pick + reset, 또는 `git branch` 로 이름표를 붙이고 reset
- **다 쓴 worktree 는 지운다.** 에이전트에게 맡긴 일이 합쳐지면 `git worktree remove` 와 `git branch -d` 까지. `git worktree list` 가 길어지면 무엇이 진행 중인지 알 수 없다

## 더 읽기

- [git worktree](https://git-scm.com/docs/git-worktree) · [git stash](https://git-scm.com/docs/git-stash) · [git cherry-pick](https://git-scm.com/docs/git-cherry-pick)
- [gitrevisions — 점 두 개 · 세 개](https://git-scm.com/docs/gitrevisions#_dotted_range_notations)
