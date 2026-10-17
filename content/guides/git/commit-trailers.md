## 제목 규칙: Conventional Commits

`종류(범위): 무엇을` 으로 쓴다. 범위는 빼도 된다.

| 종류       | 뜻                           | 예                                |
| ---------- | ---------------------------- | --------------------------------- |
| `feat`     | 기능 추가                    | `feat(search): add search box`    |
| `fix`      | 버그 수정                    | `fix(search): ignore empty query` |
| `docs`     | 문서                         | `docs: describe search`           |
| `refactor` | 동작은 그대로, 구조만        | `refactor(api): split request`    |
| `test`     | 테스트                       | `test(api): cover timeout`        |
| `chore`    | 그 밖의 잡일 (설정 · 의존성) | `chore: bump astro`               |

- 호환이 깨지는 변경은 `feat!:` 처럼 `!` 를 붙이거나 본문 끝에 `BREAKING CHANGE: …`
- 규칙이 있으면 `git log --grep="^feat"` 로 기능만 모으거나, 릴리스 노트 · 버전 번호를 자동으로 만들 수 있다

## 꼬리말(trailer)

메시지 맨 끝, 빈 줄 다음의 `키: 값` 줄. 사람과 도구가 모두 읽는다.

| 꼬리말           | 쓰임                                                                             |
| ---------------- | -------------------------------------------------------------------------------- |
| `Co-authored-by` | 공동 작성자. GitHub 가 커밋에 함께 보여 준다 (이메일이 계정과 맞으면 아바타까지) |
| `Signed-off-by`  | "이 변경을 기여할 권리가 있다"는 서명 (DCO) — `git commit -s`                    |
| `Reviewed-by`    | 검토한 사람                                                                      |

- 붙이기: `git commit --trailer "Co-authored-by: 이름 <이메일>"` — 여러 번 쓸 수 있다
- 줄임말: `git config set trailer.ai.key Co-authored-by` 를 해 두면 `--trailer "ai: …"` 로 짧게
- 읽기: `git log -1 --format=%B`, 값만은 `--format="%(trailers:key=Co-authored-by,valueonly)"`

## 기록으로 찾고 세기

- `git log --oneline --grep="Co-authored-by: Claude"` — 에이전트와 함께한 커밋
- `git shortlog -sn --group=author --group=trailer:co-authored-by` — 작성자와 공동 작성자를 함께 센다

## 커밋 서명 (SSH)

```
git config set --global gpg.format ssh
git config set --global user.signingkey ~/.ssh/id_ed25519.pub
git config set --global commit.gpgSign true
```

- GitHub 설정의 SSH and GPG keys 에 같은 공개 키를 **Signing key** 로 올리면 커밋 옆에 Verified 가 붙는다
- 내 컴퓨터에서 확인하려면 `gpg.ssh.allowedSignersFile` 에 키를 적고 `git log --show-signature`
- 저장소 보호 규칙의 "Require signed commits" 로 서명한 커밋만 main 에 들어오게 할 수 있다

## 최신 Git

- **2.29 `shortlog --group`** — 작성자 말고 꼬리말(`trailer:<키>`)로도 묶어 센다
- **2.32 `commit --trailer`** — 꼬리말을 손으로 쓰지 않고 붙인다
- **2.34 SSH 서명** — GPG 를 따로 설치하지 않고 쓰던 SSH 키로 커밋에 서명한다

## AI 에이전트와 쓸 때

- **규칙은 AGENTS.md 에.** 커밋 제목 규칙과 꼬리말을 적어 두면 에이전트가 그대로 따른다. 에이전트 도구 중에는 기본으로 `Co-Authored-By` 를 붙이는 것도 있다 — DevKeys 의 커밋도 그렇다
- **누가 했는지 구분되게.** 에이전트 전용 계정으로 커밋하면 작성자로, 사람 계정으로 커밋하면 꼬리말로 구분된다. 둘 중 하나는 꼭 남긴다
- **사람의 확인은 서명으로.** 에이전트가 만든 커밋도 사람이 검토한 뒤 서명해 합치면, 기록에 "누가 책임지고 넣었나"가 남는다
- 문제가 생기면 `--grep` 으로 에이전트와 함께한 커밋부터 살펴보고, 5부 "AI가 만든 버그 찾기" 세트의 `bisect` 로 좁힌다

## 더 읽기

- [Conventional Commits](https://www.conventionalcommits.org/ko/v1.0.0/) · [git interpret-trailers](https://git-scm.com/docs/git-interpret-trailers)
- [GitHub — 공동 작성자가 있는 커밋 만들기](https://docs.github.com/ko/pull-requests/committing-changes-to-your-project/creating-and-editing-commits/creating-a-commit-with-multiple-authors) · [커밋 서명](https://docs.github.com/ko/authentication/managing-commit-signature-verification/about-commit-signature-verification)
