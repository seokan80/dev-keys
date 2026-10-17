## 태그 두 가지

| 종류        | 만들기                       | 들어 있는 것                     | 쓰는 곳                                              |
| ----------- | ---------------------------- | -------------------------------- | ---------------------------------------------------- |
| 가벼운 태그 | `git tag v1.0.0 [커밋]`      | 커밋을 가리키는 이름뿐           | 나만 보는 표시                                       |
| 주석 태그   | `git tag -a v1.1.0 -m "..."` | 만든 사람 · 시각 · 메시지 (객체) | 릴리스 — `describe` · `--follow-tags` 가 이것만 본다 |

서명 태그는 `git tag -s` — 커밋 서명과 같은 키(GPG · SSH)를 쓴다 (5부 "기록에 남기기").

## 태그 올리기 · 지우기

| 하는 일                  | 명령                                                         |
| ------------------------ | ------------------------------------------------------------ |
| 태그 하나 올리기         | `git push origin v1.1.0`                                     |
| 커밋과 그 주석 태그 함께 | `git push --follow-tags` (늘 하려면 `push.followTags true`)  |
| 모든 태그                | `git push --tags` — 지운 줄 알았던 옛 태그까지 올라가니 조심 |
| 원격 태그 목록           | `git ls-remote --tags origin`                                |
| 로컬 / 원격 태그 지우기  | `git tag -d v1.0.0` / `git push origin --delete v1.0.0`      |

**올린 태그는 옮기지 않는다.** 같은 이름이 다른 커밋을 가리키면, 이미 받은 사람은 옛 것을 그대로 가진다(`fetch` 는 기본으로 있는 태그를 덮어쓰지 않는다). 잘못 붙였으면 다음 번호로 새로 낸다.

## 버전 이름

- **유의적 버전(SemVer)** `주.부.수` — 호환이 깨지면 주, 기능을 더하면 부, 버그만 고치면 수
- `git describe` — `v1.1.0-1-g19d7515` = v1.1.0 뒤 1커밋, 그 커밋 해시. 빌드에 넣는 버전 문자열로 좋다. 가벼운 태그도 보려면 `--tags`
- 웹 서비스처럼 계속 배포하면 날짜 · 빌드 번호로 태그를 다는 팀도 많다 (4부 트렁크 기반)

## GitHub 릴리스

릴리스 = 태그 + 설명 + 첨부 파일. `gh release create v1.2.0 --generate-notes` 는 앞 릴리스 뒤로 합친 PR 목록으로 설명을 만든다.

- 설명을 직접: `--notes "..."` · 태그 메시지를 그대로: `--notes-from-tag`
- 빌드 결과를 붙이기: `gh release create v1.2.0 dist/app.zip`
- 시험판: `--prerelease` · 아직 공개하지 않기: `--draft`
- 태그가 원격에 있는지 확인하고 만들기: `--verify-tag` (없으면 gh 가 태그를 새로 만들어 버린다)

## AI 에이전트와 쓸 때

- **릴리스 노트 초안은 맡겨도, 태그는 사람이.** `git log v1.1.0..v1.2.0 --oneline` 이나 `--generate-notes` 결과로 에이전트가 요약을 쓰게 하고, 태그 · 배포는 사람이 확인하고 단다
- **Conventional Commits 를 지키면** 에이전트 · 도구가 바뀐 기능(feat) · 고친 버그(fix)를 나눠 노트를 만들기 쉽다 (5부 "기록에 남기기")
- **태그를 옮기지 말 것** 을 규칙에 적어 둔다 — 실수로 `git tag -f` · `push --force` 하면 배포 기록이 어긋난다

## 더 읽기

- [git tag](https://git-scm.com/docs/git-tag) · [git describe](https://git-scm.com/docs/git-describe) · [gh release create](https://cli.github.com/manual/gh_release_create) · [유의적 버전](https://semver.org/lang/ko/)
