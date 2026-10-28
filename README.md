# DevKeys (가칭)

개발자용 타자 연습 웹. Git 명령·코드 따라치기, 뜻 보고 치기, 커밋 트리 미션.

- 서비스(개발 중): https://dev-keys.seokan.workers.dev
- 기획·결정: [docs/개발계획서.md](docs/개발계획서.md)
- 실행 계획(마일스톤별 작업): [docs/구현계획.md](docs/구현계획.md)
- 작업 규칙: [AGENTS.md](AGENTS.md)

## 개발

Node 24(`.nvmrc`), npm.

```sh
npm ci
npm run dev          # 개발 서버
npm test             # 단위 시험 + 커버리지
npm run test:e2e     # E2E (빌드 후 wrangler dev 로 띄움)
npm run build        # 콘텐츠 검증 → 정적 빌드(dist)
npm run validate:code # Java·Spring 실제 컴파일·실행 결과 비교 (JDK 21)
npm run test:code     # 코드 검증 + 검증기 오류 감지 회귀 시험
```

PR 을 열면 `https://pr-<번호>-dev-keys.seokan.workers.dev` 에 미리보기가 올라가고, main 에 병합하면 운영에 배포된다.

Java·Spring 실행 자료와 검증 방법은 [코드 세트 검증](verify/java/README.md)을 참고한다. 일반 웹 빌드에는 JDK가 필요 없으며 코드 관련 변경의 CI에서 JVM 검사를 실행한다.
