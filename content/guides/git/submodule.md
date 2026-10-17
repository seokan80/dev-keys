## 서브모듈은 "다른 저장소의 커밋 하나"

서브모듈 폴더는 파일 묶음이 아니라 **다른 저장소의 특정 커밋을 가리키는 항목**으로 기록된다 (`mode 160000`). 그래서

- 서브모듈의 파일은 내 저장소에 들어가지 않는다. 경로 · 주소는 `.gitmodules` 에, 가리키는 커밋은 트리에
- 서브모듈이 새 버전으로 바뀌어도, 내 저장소에서 **가리키는 커밋을 바꿔 커밋해야** 남는다
- 받는 사람은 서브모듈을 따로 받아야 한다

## 명령

| 하는 일                             | 명령                                                  |
| ----------------------------------- | ----------------------------------------------------- |
| 넣기                                | `git submodule add <주소> <경로>` → 커밋              |
| 처음부터 함께 받기                  | `git clone --recurse-submodules <주소>`               |
| 이미 받은 저장소에서 채우기         | `git submodule update --init --recursive`             |
| 기록된 커밋으로 맞추기 (pull 한 뒤) | `git submodule update`                                |
| 원격의 최신으로 올리기              | `git submodule update --remote` → 커밋                |
| 상태                                | `git submodule status` (`-` 안 받음, `+` 기록과 다름) |
| 무엇이 바뀌나                       | `git diff --submodule` (`=diff` 면 파일 내용까지)     |
| 빼기                                | `git rm <경로>` → 커밋                                |

`git config --global submodule.recurse true` 를 켜 두면 `pull` · `switch` 등이 서브모듈도 함께 맞춘다.

## 쓸까, 말까

| 쓰면 좋을 때                                    | 다른 방법이 나을 때                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------- |
| 다른 팀 저장소를 **정확한 버전으로** 묶어 둘 때 | 패키지로 배포되는 라이브러리 — npm · Maven 같은 패키지 관리자       |
| 공개 저장소의 일부를 그대로 가져다 쓸 때        | 자주 같이 고치는 코드 — 한 저장소(모노레포)에 두는 편이 덜 헷갈린다 |

서브모듈 안에서 고치면 커밋이 **서브모듈 저장소**에 생긴다. 그 저장소에 올리고, 바깥 저장소에서 새 커밋을 가리키게 커밋해야 한다 — 두 번 올린다.

## 최신 Git

- **2.38.1** — 로컬 경로(`file://`)로 서브모듈을 받는 것을 기본으로 막는다 (보안). 이 세트의 이야기처럼 연습용 서버를 쓸 때만 `protocol.file.allow` 를 연다
- **`git clone --recurse-submodules --jobs 8`** — 서브모듈 여럿을 함께 받는다 (`submodule.fetchJobs` 로 기본값)

## AI 에이전트와 쓸 때

- **worktree 에서는 서브모듈을 따로 채운다.** 에이전트용 worktree 를 만든 뒤 `git submodule update --init --recursive` — 비어 있으면 빌드가 실패한다
- **에이전트가 서브모듈 안을 고쳤는지.** `git status` 에 `modified: vendor/ui-kit (new commits)` 나 `(modified content)` 가 보이면, 의도한 것인지 확인한다. 보통은 서브모듈을 건드리지 않는 것이 규칙이다
- **버전 올리기는 따로 커밋.** `update --remote` 로 올린 서브모듈은 기능 변경과 섞지 말고 `chore: update ui-kit` 처럼 한 커밋으로

## 더 읽기

- [git submodule](https://git-scm.com/docs/git-submodule) · [Pro Git — 서브모듈](https://git-scm.com/book/ko/v2/Git-%EB%8F%84%EA%B5%AC-%EC%84%9C%EB%B8%8C%EB%AA%A8%EB%93%88)
