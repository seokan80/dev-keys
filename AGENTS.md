# DevKeys

개발자용 타자 연습 웹. 기획·결정은 [docs/개발계획서.md](docs/개발계획서.md), 마일스톤별 작업은 [docs/구현계획.md](docs/구현계획.md) 기준.

> 이 프로젝트는 **npm + Astro + React + TypeScript** 다. 개인 기본값(Spring Boot · Gradle)을 적용하지 않는다 (구현계획 1.1, 2026-10-16 확정).

## 규칙

- 로직은 `src/core`, UI는 `src/components`. core는 React · Astro · 브라우저 API에 의존하지 않는다 — ESLint가 막는다
- core 함수는 현재 시각 · 난수 · 저장소를 인자로 받는다 (`Date.now()`, `Math.random()`, `localStorage` 직접 호출 금지)
- core를 바꾸면 단위 테스트 필수, 테스트를 먼저 쓴다. Git 엔진은 명령별 테스트 + 결과 비교 테스트 + 실제 git 대조 테스트(`tests/unit/git-real` — 동작을 바꾸면 시나리오도 더한다)
- Git 엔진은 실제 git 기본 동작을 따른다. 다르게 하려면 docs에 이유를 남긴다
- 콘텐츠: 세트는 `content/sets/<카테고리>/<슬러그>.yaml`, 해설은 `content/guides/<카테고리>/<슬러그>.md` (형식은 구현계획 5.3). 추가하면 `npm run validate:content` 통과 필수. 미션은 권장 풀이 테스트를 함께 추가. Git 세트는 `content/curriculum/git.yaml` 의 부에도 넣는다 (목록 화면이 부로 묶여 보인다)
- 해설은 줄 위 주석(`note`·`notes`)으로 보인다. Git 세트는 명령마다 실제 출력(`output`)을 붙이고, 출력이 앞뒤로 맞는 이야기로 쓴다. 새 Git 세트는 이야기(`content/stories/git/<슬러그>.sh`)를 실제 git 으로 돌려 출력을 뽑고 `npx tsx scripts/git-story-check.ts <슬러그>` 로 맞춰 본다. `gh` 명령은 연습용 저장소 `seokan80/devkeys-sandbox`(비공개)에서 실제로 돌리고 저장소 이름 · PR 번호 · GitHub 가 만든 해시는 `rename` 으로 이야기 속 값으로 바꾼다 — 그런 이야기는 돌릴 때마다 PR 이 생기니 확인할 때만, 몰아서 돌리지 않는다. fetch · pull · clone 이 중심인 이야기는 GitHub 대신 연습용 서버 저장소(`~/server/*.git` 을 `file://` insteadOf 로)에서 돌린다 — GitHub 에서 받으면 `remote:` 숫자가 실행마다 달라진다. 순서 · 범위는 구현계획 5.7 Git 커리큘럼
- Git 세트의 `scene`은 그 명령 뒤의 상태를 적는다 (앞 장면 · 실제 Git 동작과 맞아야 한다). 브랜치처럼 커밋 트리가 바뀌는 세트는 `engine`을 두어 엔진이 커밋 그래프를 만들게 한다(타자 영역 옆에 늘 보인다) — 숨은 커밋은 `before`, 트리와 상관없는 명령은 `skipEngine`, 그 줄을 끝냈을 때 그래프 아래 설명은 `tree.caption`. 엔진에 없는 원격 브랜치 · 태그는 `origin/…` · `tags/…` 이름의 브랜치로 흉내 낸다(그림에서 점선 · `tag:` 로 그린다 — 구현계획 5.7). 코드 세트의 `result`는 실제로 실행했을 때의 값이어야 한다
- 도전 모드 문제(`type: recall`)는 따라친 명령을 설명만 보고 치게 한다. 엔진이 아는 명령은 `context`를 두어 동의어를 엔진으로 판정한다 — 단, 결과 트리가 같아도 뜻이 다른 명령(`branch -d`/`-D`, 이름을 쓴 `switch`/`switch -`, 목록 보기)에는 두지 않는다. prompt 의 `<자리>` 뒤에는 조사를 붙이지 않는다(값이 바뀌면 어긋난다)
- 트리 미션(`content/missions/<슬러그>.yaml`)은 시작 명령 · 권장 풀이만 쓰고 목표는 엔진이 만든다. 새 미션은 `npm test -- -u` 로 목표 트리 스냅샷을 만든 뒤 사람이 확인한다
- Shell 세트는 Bash + GNU 도구 기준. 명령마다 `fileState`로 명령 뒤 현재 경로·파일 트리를 적고 `content/stories/shell/<슬러그>.sh`를 실제 실행해 출력·상태를 검증한다 (`npm run validate:shell`, build에서 필수). 이야기는 임시 디렉터리에서만 실행하며 브라우저 입력은 실행하지 않는다. 의도한 비영 종료 상태는 copy 항목의 `exitCode`(기본 0)에 적는다. `$?`는 직전 학습 명령의 상태를 쓰며 `PIPESTATUS`는 같은 명령 안에서 즉시 읽는다. Shell 도전은 앞뒤 공백만 무시하고 명시한 답과 비교한다 — 따옴표를 지우는 Git 판정을 쓰지 않는다. 세트는 `content/curriculum/shell.yaml`에도 넣는다
- Vim은 `content/sets/vim/<슬러그>.yaml`의 `initial`·`steps`로 키 동작을 연습한다(일반 copy/recall 세트와 다르다). 특수 키는 `keys`에 `<Esc>`·`<CR>`·`<BS>`·`<C-r>`로 적고 UI에서는 실제 키 이벤트로 받는다. 본문·커서·모드·종료를 판정하며 복사·저장 단계에는 `checks: [register]`·`[saved]`를 더한다. `npm test`가 실제 Vim과 권장 풀이의 Normal 단계 결과를 대조하므로 검증 환경에 Vim 9 이상이 필요하다. 지원 밖 동작은 명시적으로 거절한다.
- 코드 세트는 레퍼런스로 쓰인다: 최신 방식(Java 21, Spring Boot 4 · Security 7)만, 한국어 설명은 줄별 해설(`notes`의 `at`)로, 컴파일에 필요한 앞뒤 코드는 `hidden`에 (구현계획 5.6)
- Java·Spring copy 문제는 `verify/java/cases.yaml`에 등록하고 `verify/java/cases/<세트 id>/<문제 id>/VerifyMain.java`에서 실제 실행한다. `notes.result`마다 `Verification.check(at, 실제 계산한 문자열)`가 필요하며 빠진 결과도 실패한다. `npm run validate:code`(JDK 21)와 검증기 회귀 시험 `npm run test:code`를 통과해야 한다. 코드·검증기·의존성 변경은 CI 필수 check에서 JVM 검사 후 배포한다. 형식은 [verify/java/README.md](verify/java/README.md).
- 따라치기 텍스트는 출력 가능한 ASCII만
- 타이핑 화면 근처에 광고 · 팝업 요소를 두지 않는다
- 범위 밖 기능(로그인, 충돌 시뮬레이션, 원격 저장소)은 구현하지 않는다
- UI 문구는 한국어
- 색은 Tailwind 의 slate · emerald · sky · amber · rose · fuchsia 계열만 쓴다. 어두운 바탕의 흐린 글자는 slate-400 부터(slate-500 은 대비 4.5 미만 — Lighthouse 접근성). 화이트 테마는 이 계열의 단계를 뒤집어 만든다 — 새 계열을 쓰면 `scripts/gen-light-theme.ts` 의 목록에 더하고 다시 만든다

## 명령

| 할 일            | 명령                                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| 개발 서버        | `npm run dev`                                                                                                  |
| 검사 (CI와 같음) | `npm run lint` · `npm run format:check` · `npm run typecheck` · `npm test` · `npm run build`                   |
| E2E              | `npm run test:e2e` — 로컬은 빌드 후 `wrangler dev`로 띄워 시험. `E2E_BASE_URL`을 주면 그 주소를 시험           |
| 콘텐츠 검증      | `npm run validate:content` (`build`가 먼저 실행한다)                                                           |
| Shell 출력 검증  | `npm run validate:shell` — 실제 Bash 이야기의 명령·출력·현재 경로·파일 상태 비교                               |
| 코드 실행 검증   | `npm run validate:code` · `npm run test:code` — JDK 21 필요, 실제 컴파일·실행 결과와 실패 감지 확인            |
| 명령 찾기 정답률 | `npm run eval:commands` — 검색 · 세트 · 상황 문장을 바꾸면 돌린다. 기준선은 `tests/unit/commands/eval.test.ts` |

## 작업 방식

- 이슈 하나 = 브랜치 하나(`<이슈번호>-<짧은 이름>`) → PR → 저장소 주인의 승인·병합 또는 배포 지시 → 병합
- 할 일은 시작하기 전에 이슈로 만들어 프로젝트 보드(#6) Todo 에 할 순서대로 올려 둔다 — 저장소 주인이 다음 작업을 미리 볼 수 있게. 시작할 때 In Progress, PR 은 In Review
- main 보호 설정은 유지한다: 필수 검사(`check` · `deploy` · `e2e`)와 대화 해결을 확인한다. `seokan80` 단일 계정에서는 자기 PR을 GitHub Approve 할 수 없으므로, 모든 필수 검사 통과 후 저장소 주인이 대화에서 승인하거나 병합·배포를 지시하면 관리자 병합한다. 지시가 없으면 PR을 검토 대기로 둔다
- PR마다 미리보기 `https://pr-<번호>-dev-keys.seokan.workers.dev`, main은 `https://dev-keys.seokan.workers.dev`로 자동 배포
- 콘텐츠 검수는 PR 미리보기(또는 `npm run dev`)에서 오른쪽 아래 "검수 모드"를 켜고 `↓`(채우기) · Enter(출력 · 그림)로 넘겨 본다. 운영 빌드에는 이 스위치가 없다
- 병합 · 배포가 끝나면 브랜치와 작업 트리를 바로 지운다
- 마일스톤이 끝나면 `docs/구현계획.md` 체크박스를 갱신한다

## 환경

- Node 24 (`.nvmrc`), npm (`packageManager`). TypeScript는 6.0으로 고정 — typescript-eslint · @astrojs/check가 7을 아직 지원하지 않는다
- GitHub 작업 계정은 모두 `seokan80`으로 통일한다(2026-10-28 저장소 주인 지시). 환경 관리·기능·콘텐츠·버그 수정·이슈·커밋·PR·병합·배포 모두 포함한다. `seokanai`는 보류하며, 별도 지시 전까지 전환하지 않는다.
- 쓰기 전에 `gh api user --jq .login`이 `seokan80`이고 `git var GIT_AUTHOR_IDENT`의 작성자가 `seokan80`인지 확인한다. 다르면 쓰기를 멈추고 알린다. 계정 신원을 위장하거나 전역 인증을 임의 변경하지 않는다.
- CI 배포는 사람 계정이 아니라 저장소의 Cloudflare API 토큰 권한으로 실행된다. GitHub 계정과 Cloudflare 토큰 권한을 혼동하지 않는다.
- Cloudflare 자격 증명은 저장소에 두지 않는다. CI는 시크릿 `CLOUDFLARE_API_TOKEN`, 변수 `CLOUDFLARE_ACCOUNT_ID`를 쓴다
- `astro preview`는 AI 에이전트 환경에서 백그라운드로 뜬다. 끌 때는 `npx astro preview stop`
- 주소는 끝 슬래시 없이(`trailingSlash: 'never'`, `build.format: 'file'`). Workers 정적 자산이 리다이렉트하지 않는다
- 사이트 주소는 `astro.config.mjs` 의 `site` 하나(대표 주소 · 공유 카드 · sitemap · robots 가 따른다), 이름 · 저장소 주소는 `src/lib/site.ts`. 도메인 연결 순서는 구현계획 M7
- 서버에서 그린 React 아일랜드는 JS가 늦게 오는 배포 환경에서 하이드레이션 전에 입력을 받으면 덮어써진다. E2E는 하이드레이션(`astro-island:not([ssr])`)을 기다리고, 검색 노출이 필요 없는 화면은 `client:only`로 그린다
