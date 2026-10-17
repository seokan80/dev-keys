## 올린 커밋을 고치면

커밋을 고치면(`--amend` · `rebase`) 새 커밋이 생긴다. 원격에는 옛 커밋이 있으니 둘은 갈라진 상태가 되고, 보통 `git push` 는 거절된다. 이때 길은 셋이다.

| 하는 일                       | 결과                                                                              |
| ----------------------------- | --------------------------------------------------------------------------------- |
| `git pull` 하고 push          | 옛 커밋과 새 커밋이 **둘 다** 남는다 — 고친 의미가 없다                           |
| `git push --force`            | 원격을 묻지 않고 덮어쓴다. 그새 남이 올린 커밋이 사라진다                         |
| `git push --force-with-lease` | 원격이 **내가 마지막으로 본 그대로일 때만** 덮어쓴다. 아니면 `stale info` 로 거절 |

**규칙:** 덮어쓰기는 내 브랜치(PR 브랜치)에서만. main 처럼 함께 쓰는 브랜치는 브랜치 보호로 강제 push 를 막아 둔다.

## lease 가 못 막는 경우와 force-if-includes

lease 는 "원격 = 내 `origin/브랜치`" 인지 본다. 그런데 `git fetch` 를 하면(편집기가 몰래 하기도 한다) `origin/브랜치` 가 원격의 최신으로 바뀌어, **반영하지 않았는데도** lease 가 통과한다 — 동료의 커밋이 지워진다.

`git config --global push.useForceIfIncludes true` (2.30) 를 켜 두면, 받아 온 원격 커밋이 내 브랜치 기록에 들어간 적이 없을 때 거절한다. 받아 온 것은 `rebase` 나 `merge` 로 넣은 뒤 올린다.

## range-diff — 무엇을 고쳤나

`git range-diff <기준> <옛 끝> <새 끝>` 은 고치기 전후의 커밋을 짝지어 커밋마다 무엇이 달라졌는지 보여 준다.

| 표시 | 뜻                    |
| ---- | --------------------- |
| `=`  | 그대로                |
| `!`  | 바뀜 — 아래에 차이    |
| `<`  | 옛 쪽에만 (빠진 커밋) |
| `>`  | 새 쪽에만 (더한 커밋) |

옛 끝은 덮어쓰기 전 원격 위치 `origin/브랜치@{1}`, 또는 rebase 직후의 `ORIG_HEAD`. 줄여서 `git range-diff @{u}...HEAD` 처럼 점 셋으로도 쓴다. 강제 push 한 PR 에 "무엇을 고쳤는지" 를 남길 때 좋다 — GitHub 의 "Compare" 버튼도 같은 일을 한다.

## 최신 Git

- **2.30 `--force-if-includes`** · `push.useForceIfIncludes`
- **2.19 `range-diff`** — 그 전에는 `git tbdiff` 같은 외부 도구가 하던 일

## AI 에이전트와 쓸 때

- **에이전트에게 `--force` 를 주지 않는다.** 규칙 파일(AGENTS.md)에 "강제 push 는 `--force-with-lease` 만, 자기 브랜치에만" 을 적고, 저장소에는 main 보호를 건다
- **에이전트가 rebase 했다면 range-diff 로 확인한다.** 충돌을 풀다가 바뀐 줄이 `!` 로 드러난다
- **같은 브랜치를 사람과 에이전트가 함께 쓰지 않는다.** 이 세트의 lee 처럼 서로 덮어쓰는 일이 생긴다 — 에이전트마다 브랜치 하나(5부)

## 더 읽기

- [git push --force-with-lease](https://git-scm.com/docs/git-push#Documentation/git-push.txt---force-with-lease) · [git range-diff](https://git-scm.com/docs/git-range-diff)
