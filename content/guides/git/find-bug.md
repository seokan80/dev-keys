## bisect: 반씩 잘라 찾는다

"언제부터 깨졌지?" 를 커밋 하나씩 거슬러 올라가며 확인하면 N 번, **bisect** 로 반씩 자르면 log₂N 번이면 된다. 커밋 6개면 3번, 1000개여도 10번이다.

| 단계                                             | 명령                                              |
| ------------------------------------------------ | ------------------------------------------------- |
| 시작                                             | `git bisect start`                                |
| 지금은 나쁨                                      | `git bisect bad`                                  |
| 여기는 좋았음                                    | `git bisect good <커밋>`                          |
| (Git 이 가운데 커밋으로 옮겨 준다 — 시험해 보고) | `git bisect good` 또는 `git bisect bad` 를 되풀이 |
| 끝내기                                           | `git bisect reset` (원래 브랜치로)                |

나쁜 커밋과 좋은 커밋을 한 번에 줄 수도 있다: `git bisect start HEAD ced3b92`.

## 자동으로: bisect run

`git bisect run <명령>` 은 커밋마다 명령을 돌려 **성공(종료 코드 0)이면 good, 실패(1~127)면 bad** 로 알아서 표시한다.

- 125 로 끝나면 그 커밋은 건너뛴다(skip) — "빌드가 안 돼서 판단할 수 없음" 을 알릴 때
- 128 이상이면 탐색을 멈춘다
- 테스트 전체가 느리면 **지금 깨진 것만 확인하는 짧은 스크립트** 를 만들어 돌린다. 그 스크립트는 저장소 밖(또는 추적하지 않는 파일)에 두어야 커밋을 옮겨 다녀도 사라지지 않는다

## 막힐 때

- **판단할 수 없는 커밋** — `git bisect skip`
- **어디까지 했는지** — `git bisect log` 로 기록을 보고, 실수했으면 `git bisect replay <파일>` 로 다시
- **머지 커밋 단위로만** — `git bisect start --first-parent` (기능 브랜치 안의 작은 커밋은 건너뛰고 "어느 PR 에서" 를 찾는다)
- **good/bad 가 어색할 때** — `--term-old fast --term-new slow` 처럼 이름을 바꿀 수 있다 (성능이 느려진 커밋 찾기)

## 찾은 뒤

- 이미 공유한 커밋이면 `git revert <커밋>` 으로 그 커밋의 변경만 되돌린다 (3번째 세트 "되돌리기")
- 왜 깨졌는지는 `git show <커밋>` · `git blame` · `git log -S` 로 (기록 살펴보기)
- 같은 버그가 다시 오지 않게 그 경우를 테스트로 남긴다

## 최신 Git

- **2.29 `bisect start --first-parent`** — 머지 커밋의 첫 부모만 따라가며 찾는다. PR 단위로 합치는 저장소에서 "어느 PR 이 깨뜨렸나" 를 빠르게 찾는다

## AI 에이전트와 쓸 때

- **작게 나눠 커밋하게 한다.** 에이전트가 하루치 변경을 커밋 하나로 넣으면 bisect 가 그 커밋을 찾아도 원인이 넓다. 주제마다 커밋을 나누면 범인이 곧 원인이다
- **bisect run 은 에이전트에게 맡기기 좋다.** 테스트 명령만 있으면 사람 없이 끝까지 돈다. "bisect run 으로 처음 깨진 커밋을 찾아 보고해 줘" 로 맡기고, 결과 커밋만 사람이 읽는다
- 후보를 먼저 좁히려면 `git log --grep="Co-authored-by"` 로 에이전트와 함께한 커밋을 본다 (기록에 남기기)
- 내 작업 폴더를 그대로 두려면 worktree 를 하나 열어 거기서 bisect 한다 (에이전트 작업 격리)

## 더 읽기

- [git bisect](https://git-scm.com/docs/git-bisect) · [Pro Git (한국어) — Git으로 버그 찾기](https://git-scm.com/book/ko/v2/Git-%EB%8F%84%EA%B5%AC-Git%EC%9C%BC%EB%A1%9C-%EB%B2%84%EA%B7%B8-%EC%B0%BE%EA%B8%B0)
