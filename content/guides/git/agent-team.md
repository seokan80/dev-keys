## 팀 규칙은 파일로

| 파일                               | 누가 읽나                  | 쓰는 것                                                            |
| ---------------------------------- | -------------------------- | ------------------------------------------------------------------ |
| `AGENTS.md`                        | AI 에이전트                | 브랜치 · 커밋 규칙, 시험 명령, 하지 말 것 (main 에 바로 올리기 등) |
| `.github/CODEOWNERS`               | GitHub                     | 경로마다 검토할 사람                                               |
| `.github/pull_request_template.md` | PR 을 여는 사람 · 에이전트 | PR 본문 틀 (무엇을 · 확인한 것)                                    |

- **AGENTS.md** 는 에이전트를 위한 README 다. 여러 에이전트 도구가 작업을 시작할 때 이 파일을 읽는다. 도구마다 따로 읽는 파일(예: `CLAUDE.md`)이 있으면 그 파일에서 AGENTS.md 를 가리키게 해 규칙을 한곳에 둔다 — DevKeys 도 그렇게 한다
- **CODEOWNERS** 는 `경로 @사람…` 줄의 목록이고, 아래 줄이 위 줄을 덮는다. PR 이 그 경로를 바꾸면 GitHub 가 그 사람에게 검토를 요청한다

## 흐름

| 단계         | 명령                                                                           |
| ------------ | ------------------------------------------------------------------------------ |
| 맡기기       | 이슈 하나 = 브랜치 하나 `agent/<이슈>-<이름>` (worktree 로 따로 — 5부 첫 세트) |
| 올리기       | `git push -u origin <브랜치>`                                                  |
| 초안 PR      | `gh pr create --draft --fill`                                                  |
| 검토         | `gh pr diff` · 직접 돌려 보려면 `gh pr checkout <번호>`                        |
| 합칠 수 있게 | `gh pr ready`                                                                  |
| 승인         | (다른 사람 · 계정이) `gh pr review --approve`                                  |
| 합치기       | `gh pr merge --squash --delete-branch`                                         |

초안(draft) PR 은 실수로 합쳐지지 않는다. 에이전트는 늘 초안으로 열고, **ready 로 바꾸는 것은 사람** 으로 정해 두면 검토 없이 합쳐지는 일이 없다.

## 계정을 나누는 이유

- **자기 PR 은 승인할 수 없다.** 에이전트가 사람 계정으로 PR 을 열면 그 사람은 승인할 수 없다 (이번 세트의 오류가 실제 출력이다). 에이전트 전용 계정이나 GitHub App 으로 열면 사람이 승인할 수 있다
- **기록에서 구분된다.** 누가 연 PR · 누가 한 커밋인지 바로 보인다
- **권한을 좁힌다.** 에이전트 계정은 쓰기(Write)만, 설정 · 병합 권한은 사람에게
- 사람 계정으로 만든 **기계 계정** 은 짧은 시간에 이슈 · API 를 몰아서 쓰면 스팸으로 판정될 수 있다. 오래 자동화할 일이면 **GitHub App** 이 맞다 (`이름[bot]` 으로 활동하고, 자동화에 맞는 권한 · 한도를 가진다)

## 보호 규칙 (branch protection · ruleset)

main 에 다음을 걸어 두면 에이전트가 무엇을 하든 사람의 확인 없이 들어오지 않는다.

- PR 로만 합치기 · 승인 1명 이상 · **마지막 푸시 뒤에 받은 승인만** 인정
- 필수 검사(CI) 통과 · 대화 해결
- Code Owners 검토 필수 · 서명한 커밋만 · 강제 푸시 금지

무료 개인 계정에서는 공개 저장소에서만 쓸 수 있다 (비공개 저장소는 유료 요금제).

## squash · merge · rebase

| 방식   | main 에 남는 것                     | 언제                                    |
| ------ | ----------------------------------- | --------------------------------------- |
| squash | PR 하나 = 커밋 하나 (`제목 (#12)`)  | 에이전트처럼 커밋을 잘게 · 많이 쌓을 때 |
| merge  | 브랜치 커밋 + 머지 커밋             | 브랜치 안의 기록도 남기고 싶을 때       |
| rebase | 브랜치 커밋들을 main 위로 다시 쌓음 | 머지 커밋 없이 한 줄로                  |

## 최신 GitHub · gh

- **`gh pr merge --auto`** — 필수 검사 · 승인이 갖춰지면 알아서 합친다. 큰 저장소는 **머지 큐** 로 합치기 순서를 줄 세운다
- **`gh pr checks --watch`** — PR 의 CI 가 끝날 때까지 지켜본다

## AI 에이전트와 쓸 때

- 규칙은 **말로 하지 말고 파일로** (AGENTS.md). 에이전트는 매번 처음부터 시작하니, 저장소에 적힌 규칙만 지킨다
- 에이전트에게는 **초안까지만** 맡기고, ready · 승인 · 병합은 사람이 한다. 보호 규칙으로 그것을 강제한다
- PR 본문에 "무엇을 · 어떻게 확인했나" 를 쓰게 하면 검토가 빨라진다 (PR 템플릿)
- DevKeys 는 이 방식으로 만들었다: 에이전트 전용 계정이 이슈 · 브랜치 · 초안 PR 을, 저장소 주인이 승인을 했다

## 더 읽기

- [AGENTS.md](https://agents.md/) · [CODEOWNERS](https://docs.github.com/ko/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners) · [보호된 브랜치](https://docs.github.com/ko/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [gh pr create](https://cli.github.com/manual/gh_pr_create) · [gh pr merge](https://cli.github.com/manual/gh_pr_merge)
