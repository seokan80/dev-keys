## 흐름

| 단계            | merge 로 합칠 때                                      | rebase 로 합칠 때           |
| --------------- | ----------------------------------------------------- | --------------------------- |
| 충돌이 났다     | `git pull --no-rebase` 가 멈춤                        | `git pull --rebase` 가 멈춤 |
| 무엇이 충돌했나 | `git status` · `git diff --name-only --diff-filter=U` | 같다                        |
| 고친다          | 충돌 표시를 지우고 남길 내용으로                      | 같다                        |
| 풀었다고 표시   | `git add <파일>`                                      | `git add <파일>`            |
| 끝내기          | `git commit` (머지 커밋)                              | `git rebase --continue`     |
| 그만두기        | `git merge --abort`                                   | `git rebase --abort`        |

push 가 `! [rejected] … (fetch first)` 로 거절되면, 원격에 내게 없는 커밋이 있다는 뜻이다. 받아서 합친 뒤 다시 올린다. `--force` 로 밀어 올리면 동료의 커밋이 사라진다.

## 충돌 표시 읽기

```
<<<<<<< HEAD
Typing practice for Korean developers
||||||| 원래 내용 (zdiff3 일 때만)
Typing practice for developers
=======
Typing practice for developers and AI agents
>>>>>>> 0ff7a6b
```

- **merge** 중에는 `HEAD` 쪽이 내 것, 아래쪽이 받아 온 것
- **rebase** 중에는 반대 — `HEAD` 쪽이 받아 온 커밋(그 위에 다시 쌓는 중), 아래쪽이 옮기던 내 커밋
- 한쪽을 통째로 고를 때: `git checkout --ours <파일>` / `--theirs` (rebase 중에는 ours · theirs 도 뒤바뀐다)
- 고친 뒤 `git diff --check` 로 남은 충돌 표시가 없는지 본다

## zdiff3 와 rerere

| 설정                         | 하는 일                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------- |
| `merge.conflictStyle zdiff3` | 충돌 표시에 원래 내용(공통 조상)도 보인다. 양쪽이 각각 무엇을 바꿨는지 읽힌다 |
| `rerere.enabled true`        | 푼 충돌을 기억했다가, 같은 충돌이 다시 나면 같은 방식으로 풀어 둔다           |

rerere 는 rebase 를 여러 번 하거나, 같은 브랜치를 여러 곳(dev · stage)에 합칠 때 같은 충돌을 반복해서 푸는 일을 줄여 준다 (4부 환경 브랜치). 풀어 준 결과도 `git diff` 로 확인하고 `add` 한다.

## 충돌을 줄이는 습관

- 자주 받아 온다 — 갈라진 거리가 짧을수록 충돌이 작다
- 한 커밋에 한 가지 변경. 포맷만 바꾸는 커밋은 따로 (리뷰 · 충돌 모두 쉬워진다)
- 같은 파일을 오래 붙잡는 작업은 미리 알린다

## 최신 Git

- **2.35 `zdiff3`** — 예전 `diff3` 보다 양쪽에 같은 줄을 충돌 밖으로 빼 주어 더 짧다
- **충돌 안내(advice)** — 충돌 메시지 아래 `hint:` 줄이 다음에 칠 명령을 알려 준다. 익숙해지면 `git config set advice.mergeConflict false` 로 끈다

## AI 에이전트와 쓸 때

- **zdiff3 를 켜 두면 에이전트도 잘 푼다.** 원래 내용이 보여야 양쪽의 의도를 읽고 합칠 수 있다
- **한쪽을 통째로 버렸는지 본다.** 에이전트가 `--ours` · `--theirs` 로 쉽게 끝내면 동료의 변경이 사라진다. 결과를 `git diff` 와 테스트로 확인한다
- **표시가 남지 않았는지.** `git diff --check` 는 남은 충돌 표시를 찾아 준다 — 에이전트에게 "충돌을 풀면 `git diff --check` 와 테스트까지" 를 규칙으로 준다

## 더 읽기

- [git merge — 충돌 표시](https://git-scm.com/docs/git-merge#_how_conflicts_are_presented) · [git rerere](https://git-scm.com/docs/git-rerere) · [git rebase](https://git-scm.com/docs/git-rebase)
