## log 로 찾기

`git log` 하나로 대부분 찾는다. 옵션을 섞어 쓸 수 있다.

| 알고 싶은 것                   | 옵션                                                                                                 |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| 최근 몇 개만                   | `-3` (`-n 3` 과 같다)                                                                                |
| 바뀐 파일 · 줄 수              | `--stat`                                                                                             |
| 바뀐 파일 이름 · 상태          | `--name-status` (이름만은 `--name-only`)                                                             |
| 추가 · 삭제 · 수정된 파일만    | `--diff-filter=A` / `D` / `M` (소문자로 쓰면 그것만 뺀다)                                            |
| 누가                           | `--author=Lee` (이름 일부로 된다)                                                                    |
| 언제                           | `--since="2026-10-14 00:00"` · `--until=…` (`"2 weeks ago"` 도 된다). 날짜만 쓰면 지금 시각이 붙는다 |
| 메시지에 이 글자               | `--grep=login` (`-i` 를 더하면 대소문자 무시)                                                        |
| 코드에 이 글자가 생김 · 사라짐 | `-S token` (정규식은 `-G`)                                                                           |
| 파일 하나                      | `-- README.md` (이름이 바뀐 것까지 `--follow`)                                                       |
| 함수 하나                      | `-L :request:api.js`                                                                                 |
| 바뀐 내용까지                  | `-p`                                                                                                 |
| 모든 브랜치를 그래프로         | `--all --graph`                                                                                      |
| 원하는 모양                    | `--format="%h %an %ad %s" --date=short`                                                              |

## 커밋을 가리키는 법

- **해시 앞부분** — 7자리면 거의 겹치지 않는다 (`git show 0bc975c`)
- **`HEAD~1`** 바로 앞, **`HEAD~3`** 세 개 앞. `HEAD^` 는 첫 부모 (머지 커밋의 둘째 부모는 `HEAD^2`)
- **`커밋:파일`** 그 커밋 때의 파일 내용 (`git show HEAD~2:api.js`)
- **`main..feature`** feature 에만 있는 커밋 — 브랜치를 비교할 때 (6번 세트 "브랜치 실전")

## show · diff · log -p

| 명령               | 보여 주는 것                                |
| ------------------ | ------------------------------------------- |
| `git show <커밋>`  | 커밋 하나의 정보 + 바뀐 내용                |
| `git diff <A> <B>` | 두 시점 사이의 차이 (커밋 정보 없이 내용만) |
| `git log -p`       | 커밋마다 정보 + 바뀐 내용을 이어서          |

## 누가 이 줄을 고쳤나: blame

- `-L 2,3` 줄 범위, `-L :request` 함수 하나
- `-w` 공백만 바꾼 커밋은 건너뛴다. `-C` 는 다른 파일에서 옮겨 온 줄의 원래 커밋을 찾는다
- 포매터로 파일 전체를 바꾼 커밋 때문에 blame 이 쓸모없어지면, 그 해시를 `.git-blame-ignore-revs` 에 적고 `git config set blame.ignoreRevsFile .git-blame-ignore-revs`. GitHub 의 blame 화면도 이 파일을 따른다

## 최신 Git

- **2.52 `git last-modified`** — 폴더 안 파일마다 마지막으로 바꾼 커밋. 예전에는 파일마다 `git log -1 -- <파일>` 을 따로 돌렸다. GitHub 가 파일 목록의 "마지막 커밋" 칸을 위해 오래 써 온 기능(blame-tree)이 Git 에 들어왔다
- **2.53 `git blame --diff-algorithm=histogram`** — blame 도 diff 방식을 고를 수 있다
- **2.55 `git log --graph --graph-lane-limit=<n>`** — 브랜치가 많아 그래프가 너무 넓을 때 줄기 수를 줄인다

## AI 에이전트와 쓸 때

- **에이전트가 쓴 커밋 찾기** — 에이전트 계정으로 커밋하게 했다면 `--author=`, 사람이 커밋하면서 기록을 남겼다면 `git log --grep="Co-authored-by"` (5부 "기록에 남기기")
- **"이 코드 언제 왜 들어왔지?"** — `git log -S`, `git blame -L` 결과를 함께 주면 에이전트의 답이 정확해진다. 에이전트도 코드를 조사할 때 같은 명령을 쓴다
- **에이전트가 만든 커밋 묶음 훑기** — `git log -p main..` 은 지금 브랜치에만 있는 커밋을 내용과 함께 보여 준다

## 더 읽기

- [git log](https://git-scm.com/docs/git-log) · [git blame](https://git-scm.com/docs/git-blame) · [git last-modified](https://git-scm.com/docs/git-last-modified)
- [Pro Git (한국어) — 커밋 히스토리 조회하기](https://git-scm.com/book/ko/v2/Git%EC%9D%98-%EA%B8%B0%EC%B4%88-%EC%BB%A4%EB%B0%8B-%ED%9E%88%EC%8A%A4%ED%86%A0%EB%A6%AC-%EC%A1%B0%ED%9A%8C%ED%95%98%EA%B8%B0)
