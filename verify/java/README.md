# 코드 세트 검증

웹 앱은 npm + Astro다. 이 폴더는 저장소에 있는 Java·Spring 예제의 컴파일·실행 검증만 맡는다. JAR나 JVM 서버를 운영 사이트에 배포하지 않는다.

## 실행

Node 24, npm, **JDK 21**이 필요하다. `JAVA_HOME`을 JDK 21 설치 경로로 두고 실행한다. Gradle은 Wrapper가 내려받으므로 별도 설치가 필요 없다.

```sh
npm run validate:code  # 모든 코드 문제를 생성 → 컴파일 → 실행 → 표시 결과 비교
npm run test:code      # 위 검사 + 컴파일 오류·결과 불일치·결과 누락 회귀 시험
```

Gradle 9.8.2와 배포 파일 SHA-256을 Wrapper에 고정했다. Spring 문제에는 Spring Boot 4.1.2 BOM의 webmvc·validation·spring-test 의존성을 쓰며 Java 문제에는 JDK만 쓴다. 언어·컴파일 대상·실행 도구 체인은 Java 21, 매개변수 이름 보존 옵션은 `-parameters`다.

`npm test`의 Node 단위 테스트에는 JDK가 필요 없다. 일반 `npm run build`도 JVM을 실행하지 않는다. CI의 필수 `check`에서 Java·Spring 콘텐츠, 실행 자료, 검증기, 스키마·로더, npm 의존성, CI 설정이 바뀌면 JDK를 설치하고 `npm run test:code`를 실행한다. 여기서 실패하면 배포하지 않는다. 변경 비교에 실패해도 검사를 건너뛰지 않는다.

## 코드 문제 추가

1. `content/sets/java` 또는 `content/sets/spring`에 copy 문제를 작성한다. 컴파일에 필요한 import·클래스·메서드 등은 `hidden.before`와 `hidden.after`에 둔다.
2. `cases.yaml`에 `set`, `item`, `file`을 등록한다. `file`은 기본 패키지의 Java 파일 이름이다. 코드 본문을 검증 폴더에 복사하지 않는다.
3. `cases/<세트 id>/<문제 id>/VerifyMain.java`를 만들고 `static void run() throws Exception`에 실제 실행 시나리오를 작성한다. 같은 폴더에 보조 Java 파일도 둘 수 있다.
4. 각 `notes.result`의 `at`을 키로 `Verification.check(at, 실제로 계산한 표시 문자열)`를 호출한다. 지역 변수 결과는 `hidden.after`에서, MVC 결과는 실행 자료에서 확인할 수 있다. 예상 값을 그대로 반환하는 가짜 구현으로 바꾸지 않는다.
5. `npm run validate:content`와 `npm run test:code`를 실행하고 PR 미리보기에서 결과·해설을 검수한다.

예를 들어 본문에 `int total = ...;`이 있다면 hidden의 뒤 코드에 다음을 둘 수 있다.

```java
Verification.check(".sum();", "total = " + total);
```

기대 문자열은 `notes.result`에서 자동 생성한다. 코드가 계산한 실제 값과 완전히 일치해야 한다. 확인하지 않은 결과, 알 수 없는 키, 중복 확인도 실패한다. HashMap의 순서처럼 보장되지 않는 값은 정렬 등 표시 규칙을 해설에 밝히고 실제 값에도 같은 규칙을 적용한다.

현재 Stream은 실제 컬렉션 연산의 결과 6개를 확인한다. REST 컨트롤러는 실제 Spring MockMvc와 Jakarta Validation으로 응답 4개, 생성 본문·Location·삭제 호출·204 빈 본문·빈 제목 400·없는 글 404도 확인한다. 외부 서버·DB·인터넷 API를 호출하지 않는다.

## 생성·격리

`hidden.before + text + hidden.after`를 줄바꿈으로 이어 붙인 실제 소스를 `build/generated/<세트 id>--<문제 id>/`에 만든다. 결과 표와 실행 진입점도 생성한다. 등록되지 않은 문제·남은 등록 항목·연결되지 않은 실행 자료·예약 파일 이름·파일 충돌은 거절한다.

각 문제는 별도 Gradle 하위 프로젝트·클래스 경로로 컴파일한다. 다른 문제의 `PostService` 같은 이름이 섞이지 않는다. 생성 파일과 Gradle 산출물은 커밋하지 않는다. 개별 Java 실행은 30초, Gradle 프로세스 전체는 4분의 제한을 둔다. 검증 대상은 신뢰하는 저장소 콘텐츠이며, 브라우저 입력을 컴파일하거나 실행하는 기능이 아니다.

`test:code`는 생성 파일에만 오류를 주입하고 매번 원본을 복구한다. 정상 코드 통과 → 컴파일 실패 → 표시 결과 변경 감지 → 결과 확인 누락 감지 → 복구 후 정상 통과를 확인한다. 실제 콘텐츠 파일은 바꾸지 않는다.

기준: [Spring Boot 지원 환경](https://docs.spring.io/spring-boot/system-requirements.html), [관리 의존성](https://docs.spring.io/spring-boot/appendix/dependency-versions/coordinates.html), [Gradle JVM 호환성](https://docs.gradle.org/9.8.2/userguide/compatibility.html), [Gradle Wrapper](https://docs.gradle.org/9.8.2/userguide/gradle_wrapper.html).
