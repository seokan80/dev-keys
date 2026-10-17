## 작성자는 어디서 오나

커밋의 작성자 · 커미터는 그 순간의 `user.name` · `user.email` 이다. 설정은 가까운 것이 이긴다: 저장소(`git config`) > 폴더별 `includeIf` > 전역(`--global`). 회사 · 개인 저장소를 섞어 쓰면 2번 세트의 `includeIf` 로 폴더마다 이메일을 나눠 두는 것이 먼저다.

## 고치는 법 — 올렸나, 안 올렸나

| 상황                      | 방법                                                                     |
| ------------------------- | ------------------------------------------------------------------------ |
| 마지막 커밋 하나          | 설정을 고치고 `git commit --amend --reset-author --no-edit`              |
| 아직 안 올린 여러 개      | `git rebase --exec "git commit --amend --reset-author --no-edit" <기준>` |
| 처음 커밋부터 모두 (혼자) | 위 명령의 `<기준>` 대신 `--root`                                         |
| 이미 올린 공유 기록       | **고치지 않는다.** `.mailmap` 으로 묶어 보이게                           |
| 저장소 전체를 꼭 고쳐야   | `git filter-repo --mailmap <파일>` (따로 설치) — 모두 다시 받아야 한다   |

- `--reset-author` 는 작성 시각도 지금으로 바꾼다. 이름 · 이메일만 바꾸려면 `--author="이름 <메일>"`
- `rebase --exec` 는 커밋을 하나씩 다시 쌓을 때마다 명령을 돌린다. 테스트를 돌려 커밋마다 통과하는지 볼 때도 쓴다 (`--exec "npm test"`)
- 올린 기록을 바꾸면 해시가 모두 바뀌어, 다른 사람의 브랜치 · 열린 PR 이 어긋난다

## .mailmap

```
Kim Dev <kim@company.example>
Kim Dev <kim@company.example> <kim@personal.example>
```

- 한 줄에 `올바른 이름 <올바른 메일> <옛 메일>`. 이름만 고칠 때는 첫 줄처럼 메일 하나
- `git shortlog` · `git blame` · 기본 `git log` 의 Author 가 따른다. `--format` 에서는 `%aN` · `%aE` 가 따르고 `%an` · `%ae` 는 기록 그대로
- 저장소 맨 위에 커밋해 두면 모두에게 적용된다. `git check-mailmap` 으로 확인

## GitHub 와 이메일

- GitHub 는 커밋의 **이메일**로 계정을 찾는다. 계정에 등록하지 않은 이메일이면 프로필 사진 · 기여 그래프에 잡히지 않는다
- 개인 이메일을 드러내기 싫으면 GitHub 설정의 `<숫자>+<아이디>@users.noreply.github.com` 을 `user.email` 로 쓴다
- 회사 계정 · 개인 계정을 나눠 쓴다면 저장소마다 `user.email` 과 인증(SSH 키 · 토큰)을 함께 나눈다

## AI 에이전트와 쓸 때

- **에이전트 환경의 작성자를 확인한다.** 컨테이너 · CI 에서 도는 에이전트는 `user.email` 이 비어 있거나 기본값일 수 있다. 시작할 때 `git var GIT_AUTHOR_IDENT` 로 확인하게 한다
- **작성자는 사람, 에이전트는 꼬리말로.** 사람이 검토한 커밋이면 작성자는 사람으로 두고 `Co-authored-by:` 꼬리말로 에이전트를 남기는 방식이 흔하다 (5부 "기록에 남기기")
- **기계 계정을 쓴다면** 그 계정의 이메일도 `.mailmap` 에 넣어 집계를 정리할 수 있다

## 더 읽기

- [gitmailmap](https://git-scm.com/docs/gitmailmap) · [git rebase --exec](https://git-scm.com/docs/git-rebase#Documentation/git-rebase.txt---execltcmdgt) · [git filter-repo](https://github.com/newren/git-filter-repo)
