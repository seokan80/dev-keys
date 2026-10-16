## 세 곳을 오가는 흐름

Git 은 파일이 세 곳 중 어디에 있는지로 생각하면 쉽다.

| 곳            | 뜻                         | 옮기는 명령  |
| ------------- | -------------------------- | ------------ |
| 작업 트리     | 지금 편집하는 파일         | —            |
| 스테이징 영역 | 다음 커밋에 넣을 변경 목록 | `git add`    |
| 저장소        | 커밋으로 남은 기록         | `git commit` |

`git status` 는 이 세 곳의 차이를 보여 준다. 무엇을 할지 모르겠으면 먼저 `git status` 부터.

## 보기: diff 두 가지

- `git diff` — 작업 트리와 스테이징 영역의 차이. 아직 `add` 하지 않은 변경
- `git diff --staged` — 스테이징 영역과 마지막 커밋의 차이. 커밋하면 들어갈 변경 (`--cached` 와 같다)

커밋 전에 `git diff --staged` 로 한 번 훑어보는 습관이 실수를 많이 줄여 준다.

## 되돌리기: 어디에 있는 변경인가

| 하고 싶은 것       | 명령                          | 남는 것                  |
| ------------------ | ----------------------------- | ------------------------ |
| 스테이징 취소      | `git restore --staged <파일>` | 파일 변경은 남는다       |
| 편집한 내용 버리기 | `git restore <파일>`          | 없음 — 되돌릴 수 없다    |
| 마지막 커밋 고치기 | `git commit --amend`          | 커밋이 새로 만들어진다   |
| 마지막 커밋 취소   | `git reset --soft HEAD~1`     | 변경은 스테이징에 남는다 |

`restore` 와 `switch` 는 Git 2.23 에서 생겼다. 예전에는 둘 다 `checkout` 이 했는데, 하나의 명령이 브랜치 이동과 파일 복원을 함께 맡아 헷갈렸기 때문에 나뉘었다.

## 자주 하는 실수

- **이미 push 한 커밋을 `--amend` 하기** — 커밋이 새로 만들어지므로 원격과 기록이 갈라진다. 공유한 커밋은 고치지 말고 새 커밋을 더한다.
- **`.env` 같은 비밀 파일을 커밋하기** — `git rm --cached .env` 로 추적을 멈추고 `.gitignore` 에 추가한다. 이미 push 했다면 그 안의 비밀 값은 새로 바꿔야 한다. 기록에 남아 있기 때문이다.
- **커밋 메시지에 무엇을 했는지만 쓰기** — `docs: add README` 처럼 종류(`feat`, `fix`, `docs` …)를 앞에 붙이면 기록을 훑어보기 쉽다.

## 더 읽기

- [Pro Git (한국어) — Git 의 기초](https://git-scm.com/book/ko/v2)
- [git restore](https://git-scm.com/docs/git-restore) · [git commit](https://git-scm.com/docs/git-commit) · [git reset](https://git-scm.com/docs/git-reset)
