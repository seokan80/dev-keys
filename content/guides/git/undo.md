## 무엇을 되돌리나 — 한눈에

| 상황                                 | 명령                                               |
| ------------------------------------ | -------------------------------------------------- |
| 고친 파일 버리기 (아직 add 안 함)    | `git restore <파일>`                               |
| 스테이징만 내리기                    | `git restore --staged <파일>` · 모두는 `git reset` |
| 파일 하나를 예전 커밋 때로           | `git restore --source=<커밋> <파일>`               |
| 마지막 커밋에 더하기 · 메시지 고치기 | `git commit --amend` (메시지 그대로 `--no-edit`)   |
| 마지막 커밋 취소, 변경은 남기기      | `git reset --soft HEAD~1` · `git reset HEAD~1`     |
| 마지막 커밋과 변경 모두 버리기       | `git reset --hard HEAD~1`                          |
| 추적하지 않는 파일 지우기            | `git clean -n` 으로 보고 → `git clean -f`          |
| **이미 push 한** 커밋 되돌리기       | `git revert <커밋>`                                |
| 실수로 버린 커밋 되살리기            | `git reflog` → `git reset --hard <해시>`           |

## reset 세 모드

|                  | 브랜치(HEAD) | 스테이징 | 작업 트리 |
| ---------------- | ------------ | -------- | --------- |
| `--soft`         | 옮김         | 그대로   | 그대로    |
| `--mixed` (기본) | 옮김         | 비움     | 그대로    |
| `--hard`         | 옮김         | 비움     | **버림**  |

- 커밋을 주지 않으면(`git reset`, `git reset --hard`) 브랜치는 그 자리, 스테이징 · 작업 트리만 정리한다
- **추적하지 않는 새 파일은 세 모드 모두 건드리지 않는다.** 지우려면 `git clean`
- `--hard` 로 버린 **커밋하지 않은 변경은 되살릴 수 없다.** 망설여지면 먼저 `git stash`

## reset 이냐 revert 냐 — push 했는가

- **아직 내 컴퓨터에만 있다** → `reset` · `amend` 로 기록을 고쳐도 된다
- **이미 push 했다** → `revert`. 기록을 바꾸지 않고 "되돌리는 커밋"을 더하니 동료의 기록과 갈라지지 않는다
- push 한 커밋을 reset 하고 강제로 push 하면 동료가 받은 기록과 어긋난다. 꼭 해야 한다면 `--force-with-lease` (3부 "기록 고치기")
- 머지 커밋을 되돌릴 때는 어느 쪽을 남길지 정한다: `git revert -m 1 <머지 커밋>`

## reflog — 마지막 안전망

- HEAD 가 거쳐 간 커밋을 모두 적어 둔 내 컴퓨터만의 기록이다 (push 되지 않는다)
- `HEAD@{3}` 은 세 번 전 HEAD, `main@{yesterday}` 는 어제의 main. 브랜치별로는 `git reflog show main`
- 기본 보관: 지금 브랜치에서 닿는 기록은 90일, 닿지 않는 커밋은 30일 (`gc.reflogExpire`, `gc.reflogExpireUnreachable`)
- 커밋한 적 없는 변경은 reflog 에도 없다

## 최신 Git

- **`restore` (2.23)** — 예전에는 `git checkout <커밋> -- <파일>` 이 하던 일이다. `checkout` 이 브랜치 이동과 파일 복원을 함께 맡아 헷갈렸기 때문에 `switch` 와 `restore` 로 나뉘었다
- **`git history` (2.54~, 실험)** — `amend` 는 마지막 커밋만 고친다. `git history reword <커밋>` 은 예전 커밋의 메시지를, 2.55 의 `git history fixup <커밋>` 은 스테이징한 변경을 예전 커밋에 합친다. 뒤의 커밋들도 알아서 다시 쌓는다. 아직 실험 단계라 연습은 3부의 `rebase -i` 로 한다

## AI 에이전트와 쓸 때

- **맡기기 전에 커밋해 둔다.** 결과가 마음에 들지 않으면 `git reset --hard` 로 추적 파일을, `git clean -n` 으로 확인한 뒤 `git clean -f` 로 새 파일을 정리하면 맡기기 전으로 돌아간다
- **되돌릴 수 없는 명령은 허락받고 쓰게 한다.** `reset --hard`, `clean -fdx`, `push --force` 는 에이전트 도구의 권한 설정에서 묻도록 해 둔다
- 처음부터 worktree 로 떼어 놓고 맡기면 이런 정리가 필요 없다 (5부 "에이전트 작업 격리")
- 에이전트가 커밋까지 했다가 망쳤어도, 커밋했던 것은 `git reflog` 에 남아 있다

## 더 읽기

- [git reset](https://git-scm.com/docs/git-reset) · [git revert](https://git-scm.com/docs/git-revert) · [git reflog](https://git-scm.com/docs/git-reflog) · [git restore](https://git-scm.com/docs/git-restore)
- [Pro Git (한국어) — 되돌리기](https://git-scm.com/book/ko/v2/Git%EC%9D%98-%EA%B8%B0%EC%B4%88-%EB%90%98%EB%8F%8C%EB%A6%AC%EA%B8%B0) · [Reset 명확히 알고 가기](https://git-scm.com/book/ko/v2/Git-%EB%8F%84%EA%B5%AC-Reset-%EB%AA%85%ED%99%95%ED%9E%88-%EC%95%8C%EA%B3%A0-%EA%B0%80%EA%B8%B0)
