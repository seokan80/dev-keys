# DevKeys

개발자용 타자 연습 웹. 기획·결정은 [docs/개발계획서.md](docs/개발계획서.md), 마일스톤별 작업은 [docs/구현계획.md](docs/구현계획.md) 기준.

> 이 프로젝트는 **npm + Astro + React + TypeScript** 다. 개인 기본값(Spring Boot · Gradle)을 적용하지 않는다 (구현계획 1.1, 2026-10-16 확정).

## 규칙

- 로직은 `src/core`, UI는 `src/components`. core는 React · Astro · 브라우저 API에 의존하지 않는다 — ESLint가 막는다
- core 함수는 현재 시각 · 난수 · 저장소를 인자로 받는다 (`Date.now()`, `Math.random()`, `localStorage` 직접 호출 금지)
- core를 바꾸면 단위 테스트 필수, 테스트를 먼저 쓴다. Git 엔진은 명령별 테스트 + 결과 비교 테스트 (+ 실제 git 대조 테스트)
- Git 엔진은 실제 git 기본 동작을 따른다. 다르게 하려면 docs에 이유를 남긴다
- 콘텐츠(YAML/MDX)를 추가하면 `npm run validate:content` 통과 필수. 미션은 권장 풀이 테스트를 함께 추가
- 따라치기 텍스트는 출력 가능한 ASCII만
- 타이핑 화면 근처에 광고 · 팝업 요소를 두지 않는다
- 범위 밖 기능(로그인, 충돌 시뮬레이션, 원격 저장소)은 구현하지 않는다
- UI 문구는 한국어

## 명령

| 할 일            | 명령                                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| 개발 서버        | `npm run dev`                                                                                        |
| 검사 (CI와 같음) | `npm run lint` · `npm run format:check` · `npm run typecheck` · `npm test` · `npm run build`         |
| E2E              | `npm run test:e2e` — 로컬은 빌드 후 `wrangler dev`로 띄워 시험. `E2E_BASE_URL`을 주면 그 주소를 시험 |
| 콘텐츠 검증      | `npm run validate:content` (`build`가 먼저 실행한다)                                                 |

## 작업 방식

- 이슈 하나 = 브랜치 하나(`<이슈번호>-<짧은 이름>`) → PR → 저장소 주인 Approve → 병합
- main은 보호돼 있다: 승인 1명, 마지막 푸시 뒤 승인, 대화 해결 필요
- PR마다 미리보기 `https://pr-<번호>-dev-keys.seokan.workers.dev`, main은 `https://dev-keys.seokan.workers.dev`로 자동 배포
- 병합 · 배포가 끝나면 브랜치와 작업 트리를 바로 지운다
- 마일스톤이 끝나면 `docs/구현계획.md` 체크박스를 갱신한다

## 환경

- Node 24 (`.nvmrc`), npm (`packageManager`). TypeScript는 6.0으로 고정 — typescript-eslint · @astrojs/check가 7을 아직 지원하지 않는다
- GitHub: 저장소 주인 `seokan80`, Claude 작업 계정 `seokanai`. 세션을 시작하면 `gh api user --jq .login`과 `git var GIT_AUTHOR_IDENT`가 `seokanai`인지 확인하고, 다르면 멈추고 알린다
- Cloudflare 자격 증명은 저장소에 두지 않는다. CI는 시크릿 `CLOUDFLARE_API_TOKEN`, 변수 `CLOUDFLARE_ACCOUNT_ID`를 쓴다
- `astro preview`는 AI 에이전트 환경에서 백그라운드로 뜬다. 끌 때는 `npx astro preview stop`
- 주소는 끝 슬래시 없이(`trailingSlash: 'never'`, `build.format: 'file'`). Workers 정적 자산이 리다이렉트하지 않는다
- 서버에서 그린 React 아일랜드는 JS가 늦게 오는 배포 환경에서 하이드레이션 전에 입력을 받으면 덮어써진다. E2E는 하이드레이션(`astro-island:not([ssr])`)을 기다리고, 검색 노출이 필요 없는 화면은 `client:only`로 그린다
