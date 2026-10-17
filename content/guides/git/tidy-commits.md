## 언제 정리하나

**올리기 전, 내 브랜치에서만.** 커밋을 정리하면 해시가 모두 바뀐다. 아직 올리지 않았거나 나 혼자 쓰는 PR 브랜치라면 괜찮고, 남이 받아 간 브랜치(main 등)는 고치지 않는다. 이미 올린 내 브랜치를 고쳤다면 다음 세트(올린 커밋 고치기)처럼 `--force-with-lease` 로 올린다.

## rebase -i 편집기

`git rebase -i main` 을 치면 main 뒤의 커밋이 오래된 것부터 한 줄씩 나온다. 맨 앞 낱말을 바꾸고 저장하면 그대로 다시 쌓는다.

```
pick   68ec758 feat: add search box
fixup  5f9d638 wip
fixup  5bfe15a fix typo
pick   0fcabc9 feat: query search api
drop   bb45267 debug: log queries
```

| 낱말     | 하는 일                                                           |
| -------- | ----------------------------------------------------------------- |
| `pick`   | 그대로 둔다                                                       |
| `reword` | 메시지만 고친다 (편집기가 다시 열린다)                            |
| `squash` | 바로 위 커밋에 합친다 — 메시지도 합쳐 고칠 수 있다                |
| `fixup`  | 바로 위 커밋에 합치고 메시지는 버린다 (`fixup -C` 면 이쪽 메시지) |
| `drop`   | 뺀다 (줄을 지워도 같다)                                           |
| `edit`   | 그 커밋에서 멈춘다 — 고치고 `git commit --amend` → `--continue`   |
| 줄 순서  | 바꾸면 커밋 순서도 바뀐다                                         |

망쳤으면: 하는 중이면 `git rebase --abort`, 끝난 뒤면 `git reset --hard ORIG_HEAD` (또는 `git reflog` 에서 찾기 — 1부 "되돌리기").

## --fixup 과 --autosquash

나중에 찾은 실수를 "그 커밋에 합칠 것"으로 표시해 두고, 한 번에 정리한다.

1. 고친 것을 담고 `git commit --fixup=<대상>` — 메시지가 `fixup! <대상 메시지>`
2. `git rebase -i --autosquash main` — fixup! 커밋이 대상 아래로 옮겨져 `fixup` 으로 바뀌어 있다
3. `git config --global rebase.autoSquash true` 면 `-i` 할 때마다 저절로

- `--fixup=amend:<대상>` — 내용과 메시지를 함께 고친다 · `--fixup=reword:<대상>` — 메시지만 (2.32)
- 대상은 해시 · `HEAD~1` · 브랜치 이름 · `:/검색어`(메시지로 찾기) 모두 된다

## 쌓은 브랜치와 --update-refs

PR 을 작게 나누려고 브랜치를 쌓아 만들면(`feature/search` 위에 `feature/search-results`), 아래 브랜치를 고칠 때 위 브랜치도 다시 쌓아야 한다. `--update-refs` 는 맨 위 브랜치를 rebase 하면서 **사이에 낀 브랜치 이름표도 새 커밋으로 옮긴다.** 그다음 브랜치마다 `--force-with-lease` 로 올린다.

## 최신 Git

- **2.38 `--update-refs`** · `rebase.updateRefs true` 로 늘 켜기
- **2.44** — `--autosquash` 가 `-i` 없이도 된다
- **2.54 `git history`(실험)** — rebase 없이 지난 커밋의 메시지를 고치거나(`reword`) 나누는(`split`) 명령. 2.55 에서 `fixup` 도 생겼다. 아직 실험 단계라 이 세트는 rebase 로 한다

## AI 에이전트와 쓸 때

- **에이전트 커밋은 PR 전에 정리한다.** 에이전트는 "wip", "fix test", "try again" 같은 커밋을 많이 남긴다. 리뷰하는 사람이 읽을 단위로 `rebase -i` 해서 합친다 — 또는 PR 을 squash 로 합친다(4부 GitHub Flow)
- **정리는 사람이 고른다.** 에이전트에게 rebase -i 를 맡기면 편집기 대신 `GIT_SEQUENCE_EDITOR` 를 쓰게 되어 무엇을 합쳤는지 보이지 않는다. 결과를 `git range-diff` 로 확인한다 (다음 세트)
- **커밋 하나에 주제 하나** 가 지켜져야 나중에 `revert` · `bisect`(5부)가 쉽다

## 더 읽기

- [git rebase — 대화형 모드](https://git-scm.com/docs/git-rebase#_interactive_mode) · [git commit --fixup](https://git-scm.com/docs/git-commit#Documentation/git-commit.txt---fixupamendrewordcommit)
