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

## 이렇게 운영하는 이유

- **QA 가 확인한 것만 운영에.** 검증 서버(stage)에 무엇이 떠 있는지가 곧 다음 배포 내용이다
- **기능마다 배포 시점이 다르다.** 개발 서버(dev)에는 다 올려 보고, 통과한 것만 stage 로
- **브랜치 = 서버.** 브랜치에 push 하면 그 서버에 배포되게 묶기 쉽고, 어느 서버에 무엇이 있는지 브랜치로 보인다

국내에서도 컬리(feature → qa → stage → master), 당근(테스트용 deploy 브랜치), LINE 메시징 서버(2023, 기능 브랜치를 master 에 직접 merge 하고 develop 은 Beta 용) 등이 비슷한 구조를 쓴다.

## 규칙 다섯

1. **기능 브랜치는 main 에서 딴다.** dev 에서 따면 검증 안 된 남의 기능이 딸려 와 stage 에 함께 올라간다
2. **dev · stage 에는 같은 기능 브랜치를 각각 merge 한다.** dev 를 stage 에 통째로 merge 하지 않는다 — 검증 전 기능까지 충돌 없이 딸려 온다
3. **stage → main 은 `--ff-only` + 태그.** QA 가 본 그 커밋이 그대로 운영으로 간다 (빌드도 stage 에서 만든 것을 그대로 올리면 더 좋다)
4. **핫픽스는 태그에서 따서 main → stage → dev 로 내린다.** 내리지 않으면 다음 배포 때 버그가 되살아난다
5. **dev 는 버려도 되는 브랜치.** 지저분해지면 `git switch -C dev main` 으로 다시 만들고 진행 중인 기능만 다시 merge 한다 (팀에 알리고 `--force-with-lease`). 아무도 dev 에서 브랜치를 따지 않으니 잃는 것이 없다

어디까지 갔나: `git branch --merged stage` · `git branch --contains <커밋>`. 같은 충돌을 dev · stage 에서 두 번 푸는 일은 `rerere`(2부 "충돌 해결")가 줄여 준다.

## cherry-pick 으로 올리면 생기는 일

"dev 에 다 합치고, stage 에는 통과한 커밋만 cherry-pick" 도 흔하지만 문제가 쌓인다.

| 문제                 | 왜                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| git 이 모른다        | 복사본은 다른 커밋이라 `branch --merged` 에 안 나온다. `main..dev` 가 이미 올라간 것도 "없음"으로 |
| 딸린 커밋을 빼먹는다 | 같은 파일이면 충돌로 알지만, 다른 파일이면 **충돌 없이 깨진 채** 올라간다                         |
| 나중에 충돌          | 같은 변경이 해시 둘로 남아, 그 줄을 다시 고치고 합칠 때 충돌한다                                  |
| 검증한 조합이 다르다 | dev 서버에서 본 것(A+B+C)과 stage 에 올린 것(A+C)이 다르다                                        |

LINE 메시징 서버는 2023년에 이 방식을 기능 브랜치 merge 로 바꿨고, Meta 는 하루 수백 건 cherry-pick 하던 방식을 2016년에 그만뒀다. 꼭 써야 한다면 `-x` 를 붙이고, 원래 순서대로 범위로(`A^..B`) 가져오고, `git cherry -v stage dev` 로 `+`(아직 안 올라간 것)를 확인한다.

## 바꿔 가는 방향

PR 미리보기(PR 마다 배포 주소)가 dev 서버를, 기능 플래그가 "이번엔 A 만" 을 대신하면 dev 브랜치가 필요 없어진다 — GitHub Flow · 트렁크 기반으로 옮겨 가는 팀이 많다. 환경 브랜치를 쓰더라도 dev 는 "버려도 되는 통합 브랜치" 로만 둔다.

## AI 에이전트와 쓸 때

- **에이전트의 작업 브랜치도 main 에서.** dev 에서 따면 남의 미검증 코드 위에서 일하게 된다
- **stage · main 에 push 할 권한은 주지 않는다.** 에이전트는 기능 브랜치와 PR 까지, 환경 브랜치 merge 는 사람이
- **빠진 것 점검을 맡긴다.** "`git branch --no-merged stage` 와 `git cherry -v stage dev` 를 보고 stage 에 안 올라간 기능을 정리해 줘" — 배포 전 확인에 좋다

## 더 읽기

- [GitLab Flow — 환경 브랜치 (보관본)](https://gitlab.com/gitlab-org/gitlab/-/raw/v15.0.0-ee/doc/topics/gitlab_flow.md) · [gitworkflows — 주제 브랜치를 통합 브랜치에 merge](https://git-scm.com/docs/gitworkflows)
- [LINE — 메시징 서버 개발 프로세스 개선 (2023)](https://engineering.linecorp.com/ko/blog/improving-the-messaging-server-development-process) · [컬리 — 브랜치 전략](https://helloworld.kurly.com/blog/squad-b-team-building/)
- [Raymond Chen — Stop cherry-picking, start merging](https://devblogs.microsoft.com/oldnewthing/20180312-00/?p=98215) · [Meta — 빠른 배포 (2017)](https://engineering.fb.com/2017/08/31/web/rapid-release-at-massive-scale/)
