## 설정은 세 곳에

| 범위        | 파일                                         | 옵션             |
| ----------- | -------------------------------------------- | ---------------- |
| 이 PC 전체  | `/etc/gitconfig`                             | `--system`       |
| 내 계정     | `~/.gitconfig` (또는 `~/.config/git/config`) | `--global`       |
| 이 저장소만 | `.git/config`                                | `--local` (기본) |

같은 키가 여러 곳에 있으면 **가까운 쪽(저장소 → 내 계정 → PC)이 이긴다.** 값이 왜 그렇게 나오는지 모르겠으면 `git config list --show-origin` 으로 어느 파일에서 왔는지 본다.

## 새 문법: list · get · set (Git 2.46+)

| 하는 일   | 새 문법                                | 예전 문법 (지금도 된다)                  |
| --------- | -------------------------------------- | ---------------------------------------- |
| 목록      | `git config list`                      | `git config --list`                      |
| 값 읽기   | `git config get user.email`            | `git config user.email`                  |
| 값 쓰기   | `git config set --global user.email x` | `git config --global user.email x`       |
| 값 지우기 | `git config unset --global user.email` | `git config --global --unset user.email` |
| 파일 열기 | `git config edit --global`             | `git config --global --edit`             |

예전 문법은 인자 개수로 읽기 · 쓰기를 구분해서, 값을 빠뜨리면 쓰려던 것이 읽기가 되는 식의 실수가 났다. 새 문법은 무엇을 하는지가 이름에 드러난다. 오래된 글 · 스크립트의 예전 문법도 계속 동작한다.

## 회사 · 개인 이메일 나누기

회사 저장소에 개인 이메일로 커밋하는 실수를 막는다.

```
git config set --global includeIf.gitdir:~/work/.path ~/.gitconfig-work
git config set --file ~/.gitconfig-work user.email kim@company.com
```

- `gitdir:~/work/` — 끝의 `/` 는 그 아래 모든 저장소라는 뜻이다
- 폴더 대신 원격 주소로 나눌 수도 있다: `includeIf.hasconfig:remote.*.url:https://github.com/company/**.path`
- 확인은 그 저장소 안에서 `git config get user.email`, 밖에서는 `git -C <폴더> config get user.email`

## 켜 두면 좋은 설정

Git 은 호환성 때문에 기본값을 잘 바꾸지 않는다. 그래서 오래 쓴 사람들은 아래를 직접 켠다.

| 설정                         | 하는 일                                                     |
| ---------------------------- | ----------------------------------------------------------- |
| `push.autoSetupRemote true`  | 새 브랜치 첫 push 에 `-u origin <브랜치>` 가 필요 없다      |
| `fetch.prune true`           | 원격에서 지운 브랜치를 내 목록에서도 지운다                 |
| `merge.conflictStyle zdiff3` | 충돌 표시에 원래 내용(공통 조상)도 보여 준다                |
| `rerere.enabled true`        | 한 번 푼 충돌을 기억해 rebase 를 반복할 때 다시 풀지 않는다 |
| `diff.algorithm histogram`   | 코드를 옮기거나 끼워 넣었을 때 diff 가 읽기 쉽다            |
| `branch.sort -committerdate` | `git branch` 를 최근에 커밋한 순서로                        |
| `rebase.autoSquash true`     | `commit --fixup` 커밋을 rebase 때 알아서 합친다 (3부)       |
| `rebase.updateRefs true`     | 쌓인 브랜치를 rebase 할 때 위 브랜치들도 함께 옮긴다 (3부)  |
| `help.autocorrect prompt`    | `git stauts` 처럼 오타를 내면 맞는 명령을 물어본다          |

## .gitignore 규칙

| 규칙            | 뜻                                     |
| --------------- | -------------------------------------- |
| `*.log`         | 어느 폴더에 있든 `.log` 로 끝나는 파일 |
| `/build`        | 저장소 맨 위의 `build` 만              |
| `node_modules/` | 그 이름의 폴더 (끝의 `/` 는 폴더만)    |
| `**/tmp`        | 어느 깊이에 있든 `tmp`                 |
| `!keep.log`     | 앞에서 무시한 것 중 이것만 다시 포함   |

- **이미 추적 중인 파일에는 듣지 않는다.** `git rm --cached <파일>` 로 추적을 멈춘 뒤에야 무시된다
- 모든 저장소에 쓸 규칙(`.DS_Store`, `.idea/` 처럼 OS · 편집기가 만드는 파일)은 `~/.config/git/ignore` 에. 설정하지 않아도 Git 이 읽는다
- 나만 쓰고 공유하지 않을 규칙은 `.git/info/exclude` 에
- 무시되는 이유가 궁금하면 `git check-ignore -v <파일>`

## AI 에이전트와 쓸 때

- 에이전트는 `git add .` 로 폴더를 통째로 담기 쉽다. `.env` · 키 파일 · 로그는 **작업을 맡기기 전에** `.gitignore` 에 넣고, `git check-ignore -v` 로 확인해 둔다
- 에이전트가 커밋할 이름 · 이메일은 `--global` 대신 그 저장소에만(`git config set user.name …`) 또는 `includeIf` 로 범위를 좁힌다. 사람과 에이전트의 커밋이 기록에서 구분된다
- 비밀 값이 한 번이라도 커밋됐다면 기록에 남는다. `rm --cached` 는 앞으로만 막아 줄 뿐이니 키를 새로 발급받는다

## 더 읽기

- [git config](https://git-scm.com/docs/git-config) · [gitignore](https://git-scm.com/docs/gitignore) · [git check-ignore](https://git-scm.com/docs/git-check-ignore)
- [Pro Git (한국어) — Git 최초 설정](https://git-scm.com/book/ko/v2/%EC%8B%9C%EC%9E%91%ED%95%98%EA%B8%B0-Git-%EC%B5%9C%EC%B4%88-%EC%84%A4%EC%A0%95)
