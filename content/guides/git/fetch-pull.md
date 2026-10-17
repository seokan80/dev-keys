## fetch 와 pull

| 명령                 | 하는 일                                                                          |
| -------------------- | -------------------------------------------------------------------------------- |
| `git fetch`          | 원격의 새 커밋을 받아 `origin/…` 이름표만 옮긴다. 내 브랜치 · 작업 폴더는 그대로 |
| `git pull`           | `fetch` + 지금 브랜치에 합치기 (merge 또는 rebase)                               |
| `git pull --rebase`  | 합치기를 rebase 로 — 내 커밋을 받아 온 커밋 뒤로 옮겨 쌓는다                     |
| `git pull --ff-only` | 앞으로 옮기기만 될 때만 합친다. 갈라졌으면 아무것도 바꾸지 않고 멈춘다           |

`fetch` 는 언제 해도 안전하다. 받아 온 뒤 `git log main..origin/main` · `git diff main origin/main` 으로 무엇이 들어올지 보고 합치면 된다.

## status 는 서버에 묻지 않는다

`git status` 의 "up to date" 는 **마지막으로 받아 온 origin/main 과 같다**는 뜻이다. 동료가 그 뒤에 올린 것은 `fetch` 해야 보인다.

## 갈라졌을 때 — 어떻게 합칠지 정해 둔다

내 쪽과 원격 쪽에 서로 없는 커밋이 있으면 "갈라졌다(diverged)". 요즘 git 은 이때 어떻게 합칠지 정해 두지 않으면 `pull` 을 멈춘다.

| 설정                | 갈라졌을 때                                 | 맞는 경우                      |
| ------------------- | ------------------------------------------- | ------------------------------ |
| `pull.rebase true`  | 내 커밋을 뒤로 옮겨 한 줄로                 | 기능 브랜치 · 혼자 쓰는 브랜치 |
| `pull.rebase false` | 머지 커밋으로 합친다                        | 합친 흔적을 남기고 싶을 때     |
| `pull.ff only`      | 멈춘다 — 직접 `merge` 나 `rebase` 를 고른다 | 실수로 합쳐지는 것이 싫을 때   |

rebase 는 커밋을 새로 쌓으므로 해시가 바뀐다. **이미 올린 커밋을 rebase 해서 다시 올리면 남의 기록과 어긋난다** — 아직 올리지 않은 내 커밋을 옮길 때만 쓴다.

## 원격 브랜치로 옮겨 가기

- `git switch feature/x` — 로컬에 없고 `origin/feature/x` 가 있으면, 그것을 짝으로 하는 로컬 브랜치를 만들어 옮겨 간다
- 원격이 여럿이라 이름이 겹치면: `git switch -c feature/x --track origin/feature/x`
- `git branch -r` 은 받아 온 원격 브랜치, `git remote show origin` 은 서버에 물어서 짝 · 상태까지

## 켜 두면 좋은 설정

```
git config --global pull.rebase true        # 또는 pull.ff only
git config --global rebase.autoStash true   # 고치던 것이 있어도 pull --rebase 가 되게
git config --global fetch.prune true        # 사라진 원격 브랜치 정리 (10번 세트)
```

## 최신 Git

- **2.48** — `git fetch` 가 없던 `origin/HEAD` 를 만들어 둔다. `origin/HEAD` 는 원격의 기본 브랜치를 가리킨다
- **`@{u}`** — 지금 브랜치의 짝. `git log @{u}..` (올릴 것) · `git log ..@{u}` (받을 것) 처럼 이름 대신 쓴다

## AI 에이전트와 쓸 때

- **맡기기 직전에 받아 온다.** 에이전트가 오래된 main 위에서 일하면 나중에 충돌이 커진다. `git fetch` 후 최신 `origin/main` 에서 브랜치(또는 worktree)를 만든다
- **에이전트에게는 `pull` 보다 `fetch` 와 보고.** "fetch 하고 `git log --oneline HEAD..origin/main` 을 보여 줘" — 무엇이 바뀌었는지 사람이 보고 합치는 방식을 정한다
- **에이전트 환경에는 `pull.ff only`.** 에이전트가 모르는 사이 머지 커밋을 만들거나 rebase 하지 않게, 앞으로 옮기기만 허락한다

## 더 읽기

- [git fetch](https://git-scm.com/docs/git-fetch) · [git pull](https://git-scm.com/docs/git-pull) · [git switch](https://git-scm.com/docs/git-switch)
