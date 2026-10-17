## fork 는 언제

원본 저장소에 **쓸 권한이 없을 때** — 오픈소스에 기여하거나 다른 팀 저장소에 제안할 때. GitHub 에서 "Fork" 를 누르면 내 계정에 복사본이 생기고, 거기 올린 브랜치로 원본에 PR 을 연다. 같은 팀이라 쓸 권한이 있으면 fork 없이 브랜치로 일한다(GitHub Flow).

## 원격 둘

| 이름       | 가리키는 곳 | 하는 일               |
| ---------- | ----------- | --------------------- |
| `origin`   | 내 fork     | 올리는 곳 (PR 브랜치) |
| `upstream` | 원본        | 받는 곳 (최신 코드)   |

- `gh repo fork <원본> --clone` 은 fork 만들기 · 받기 · upstream 등록을 한 번에 한다
- 브랜치는 **upstream/main 에서** 딴다 — 내 fork 의 main 은 오래됐을 수 있다
- PR 은 원본으로: `gh pr create --repo <원본>` (gh 는 fork 에서 치면 원본을 기본으로 묻는다)

## 내 fork 맞추기

| 방법                                                                                | 하는 일                                                           |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `git fetch upstream` → `git merge --ff-only upstream/main` → `git push origin main` | 로컬과 fork 의 main 을 원본에 맞춘다 (이 세트)                    |
| GitHub 의 **Sync fork** 버튼 · `gh repo sync`                                       | fork 의 main 을 GitHub 에서 바로 맞춘다 (그 뒤 로컬은 `git pull`) |

내 fork 의 main 에는 커밋하지 않는다. 그래야 늘 fast-forward 로 따라간다.

## 받는 곳과 올리는 곳 나누기 (삼각형 흐름)

```
git branch --set-upstream-to=upstream/main   # main 은 원본에서 받고
git config --global remote.pushDefault origin   # 올리기는 늘 내 fork 로
```

이러면 `git pull` 은 원본에서, `git push` 는 내 fork 로 간다. 올릴 곳은 `@{push}`, 받을 곳은 `@{u}` — `git log @{push}..` 는 아직 fork 에 안 올린 커밋이다.

## PR 이 오래됐을 때

원본이 앞서가면 PR 브랜치를 `git rebase upstream/main` 으로 최신 위로 옮기고 `git push --force-with-lease`. 관리자가 합치기 쉽고, 충돌은 내가 먼저 푼다. 관리자가 PR 에서 "Allow edits by maintainers" 로 직접 고치기도 한다.

## AI 에이전트와 쓸 때

- **원본 기여 규칙을 먼저 읽게 한다.** CONTRIBUTING.md · AGENTS.md · 이슈 템플릿 — 오픈소스는 프로젝트마다 커밋 · PR 규칙이 다르다
- **에이전트가 만든 PR 은 밝힌다.** 많은 프로젝트가 AI 로 만든 기여에 대한 규칙을 두고 있다. 내가 이해하고 검토한 변경만 보낸다
- **fork 에서만 일하게.** 에이전트 토큰은 내 fork 에만 쓸 권한을 준다 — 원본에 직접 올릴 일이 없다

## 더 읽기

- [GitHub — fork 하기](https://docs.github.com/ko/pull-requests/collaborating-with-pull-requests/working-with-forks/fork-a-repo) · [fork 맞추기](https://docs.github.com/ko/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork) · [gh repo sync](https://cli.github.com/manual/gh_repo_sync)
- [git config remote.pushDefault](https://git-scm.com/docs/git-config#Documentation/git-config.txt-remotepushDefault)
