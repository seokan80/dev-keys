## 세 가지 방식 — 고르는 기준

4부의 세 세트는 팀이 일하는 방식 셋을 하나씩 따라 친다. 어느 것이 맞는지는 **얼마나 자주 배포하나**, **검증(QA)을 어디서 하나** 로 갈린다.

| 항목           | GitHub Flow                  | 트렁크 기반 + 기능 플래그                              | 환경 브랜치                                         |
| -------------- | ---------------------------- | ------------------------------------------------------ | --------------------------------------------------- |
| 브랜치         | main + 짧은 기능 브랜치      | main + 몇 시간짜리 브랜치, 릴리스 브랜치는 필요할 때만 | main · stage · dev + 기능 브랜치                    |
| 배포           | PR 을 합치면 main 이 배포    | main 을 자주 배포, 기능은 플래그로 연다                | 브랜치마다 서버 (dev 개발 · stage 검증 · main 운영) |
| 개발 서버 역할 | PR 미리보기                  | PR 미리보기 · 플래그를 켠 계정                         | dev 브랜치                                          |
| "이번엔 A 만"  | A 의 PR 만 합친다            | A 의 플래그만 켠다                                     | 통과한 기능 브랜치만 stage 에 merge                 |
| 핫픽스         | 같은 길 (브랜치 → PR)        | main 에 먼저 → 릴리스 브랜치로 `cherry-pick -x`        | 태그에서 따서 main → stage → dev                    |
| 맞는 팀        | 하루에도 여러 번 배포하는 웹 | 배포가 아주 잦고 자동 테스트가 탄탄한 팀               | QA 서버가 따로 있고 기능마다 배포 시점이 다른 팀    |

- 앱스토어 심사를 거치는 앱 · 설치형 제품처럼 **버전을 붙여 내고 여러 버전을 지원하면** GitFlow(develop · release · hotfix 브랜치)나 릴리스 브랜치 방식을 본다. GitFlow 를 만든 사람도 2020년에 "계속 배포하는 웹이면 GitHub Flow 같은 더 단순한 흐름을" 이라고 덧붙였다
- dev 에 다 합치고 stage 로 **커밋을 골라 cherry-pick** 하는 방식도 현장에 있지만, 빠뜨림 · 충돌 · 해시가 다른 같은 변경이 쌓여 바꾼 사례가 많다 (환경 브랜치 해설)

## GitHub Flow 한 바퀴

1. main 에서 브랜치 — 할 일 하나에 하나, 이름으로 무슨 일인지 (`feature/search`, `fix/login-label`)
2. 작게 커밋하고 **일찍 push** — 올려야 PR 을 열고 검사 · 미리보기가 돈다
3. PR — 무엇을 왜 바꿨는지. 리뷰 의견은 같은 브랜치에 커밋해 반영한다
4. 검사 통과 + 승인 → 합친다 → **main 은 곧 배포**
5. 브랜치를 지우고 `git switch main` · `git pull`

**규칙은 하나: main 은 언제든 배포할 수 있어야 한다.** 그래서 main 에 직접 push 하지 않고, 검사를 통과한 PR 만 합친다.

## 합치는 방법 세 가지

| GitHub 버튼           | main 에 남는 것                         | 맞는 경우                                |
| --------------------- | --------------------------------------- | ---------------------------------------- |
| Create a merge commit | 브랜치 커밋 전부 + 머지 커밋            | 브랜치의 커밋을 그대로 남기고 싶을 때    |
| Squash and merge      | PR 하나가 커밋 하나 (`… (#12)`)         | 리뷰 반영 · wip 커밋이 섞인 PR (이 세트) |
| Rebase and merge      | 브랜치 커밋을 main 위에 다시 쌓아 한 줄 | 커밋을 미리 정리해 둔 PR (3부)           |

squash 로 합치면 브랜치의 커밋들은 main 에 들어가지 않는다. 그래서 그 브랜치를 계속 쓰면 다음 PR 에 옛 커밋이 다시 나온다 — **합친 브랜치는 지우고 새로 딴다.**

## 지켜 주는 설정 (저장소 Settings)

- **브랜치 보호(Rulesets)** — main 에 직접 push 금지, 승인 · 검사 통과가 있어야 합치기, 강제 push 금지
- **Automatically delete head branches** — 합친 PR 의 브랜치를 저절로 지운다
- **merge queue** — PR 이 많으면, 앞에 줄 선 PR 들까지 합친 상태로 검사한 뒤 합쳐 main 이 깨지지 않게 한다
- **PR 미리보기** — PR 마다 배포 주소를 붙인다 (DevKeys 도 이렇게 만든다). 공용 개발 서버가 필요 없어진다

## AI 에이전트와 쓸 때

- **에이전트도 같은 길로.** 에이전트는 브랜치를 만들고 draft PR 을 연다. 사람은 리뷰 · 승인 · 합치기를 맡는다 (5부 "함께하는 팀")
- **PR 을 작게.** 에이전트는 한 번에 많이 바꾸기 쉽다. 할 일을 쪼개 PR 하나를 리뷰할 수 있는 크기로 — 작게 자주 합치는 팀이 배포도 안정적이라는 것이 DORA 연구의 결론이다
- **검사가 마지막 관문.** 브랜치 보호로 "검사 통과 + 사람 승인" 을 강제하면 에이전트가 실수해도 main 은 지켜진다

## 더 읽기

- [GitHub flow (GitHub Docs)](https://docs.github.com/ko/get-started/using-github/github-flow) · [Scott Chacon — GitHub Flow (2011)](https://scottchacon.com/2011/08/31/github-flow/)
- [PR 합치기 방법](https://docs.github.com/ko/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/about-merge-methods-on-github) · [merge queue](https://docs.github.com/ko/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue) · [gh pr merge](https://cli.github.com/manual/gh_pr_merge)
