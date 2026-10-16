## 브랜치는 커밋을 가리키는 이름표

브랜치는 커밋을 복사하는 것이 아니라 **커밋 하나를 가리키는 이름표**다. 그래서 `git branch feature/login` 은 아주 가볍다. 커밋하면 지금 있는 브랜치(HEAD 가 가리키는 브랜치)의 이름표만 새 커밋으로 옮겨 간다.

## 만들기와 이동

| 하고 싶은 것     | 지금 방식                | 옛 방식                    |
| ---------------- | ------------------------ | -------------------------- |
| 이동             | `git switch <브랜치>`    | `git checkout <브랜치>`    |
| 만들면서 이동    | `git switch -c <브랜치>` | `git checkout -b <브랜치>` |
| 바로 전 브랜치로 | `git switch -`           | `git checkout -`           |

`checkout` 은 지금도 동작하고 오래된 문서에 많이 나오니 둘 다 알아 두면 좋다.

## 합치기: merge 와 rebase

**merge** 는 두 갈래를 합치는 커밋(머지 커밋)을 만든다. 합칠 쪽이 갈라진 적 없이 뒤처져 있기만 하면 머지 커밋 없이 이름표만 앞으로 옮기는데, 이를 **fast-forward** 라고 한다. `--no-ff` 를 주면 이때도 머지 커밋을 만들어 "여기서 기능 하나가 들어왔다"는 흔적을 남긴다.

**rebase** 는 지금 브랜치의 커밋들을 대상 브랜치 끝에 **새 커밋으로 다시 쌓는다**. 기록이 한 줄로 깔끔해지지만 커밋 해시가 바뀐다. 그래서 다른 사람과 공유한 브랜치는 rebase 하지 않는다.

**cherry-pick** 은 커밋 하나만 골라 지금 브랜치에 복사해 온다. 운영 브랜치에 급한 수정 하나만 옮길 때 쓴다.

## 정리하기

- `git branch -d` 는 합쳐진 브랜치만 지운다. 안전장치이므로, 거부되면 정말 지워도 되는지 먼저 확인한다.
- `git branch -D` 는 강제로 지운다. 그 브랜치에만 있던 커밋은 이름표가 없어져 찾기 어려워진다 (`git reflog` 로 한동안은 찾을 수 있다).

## 작업 중에 급한 일이 생기면

`git stash` 로 커밋하지 않은 변경을 치워 두고 다른 브랜치로 옮긴다. 돌아와서 `git stash pop` 으로 다시 꺼낸다. 치워 둔 것이 여러 개면 `git stash list` 로 확인한다.

## 더 읽기

- [Pro Git (한국어) — Git 브랜치](https://git-scm.com/book/ko/v2)
- [git switch](https://git-scm.com/docs/git-switch) · [git merge](https://git-scm.com/docs/git-merge) · [git rebase](https://git-scm.com/docs/git-rebase) · [git stash](https://git-scm.com/docs/git-stash)
