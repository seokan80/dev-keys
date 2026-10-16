## 주소와 메서드를 잇는 법

`@RequestMapping("/api/posts")` 가 클래스 전체의 앞 경로가 되고, 메서드마다 HTTP 메서드 애너테이션을 붙인다.

| 애너테이션                | 요청                  | 이 세트에서 |
| ------------------------- | --------------------- | ----------- |
| `@GetMapping`             | `GET /api/posts`      | 목록        |
| `@GetMapping("/{id}")`    | `GET /api/posts/3`    | 하나 조회   |
| `@PostMapping`            | `POST /api/posts`     | 만들기      |
| `@DeleteMapping("/{id}")` | `DELETE /api/posts/3` | 지우기      |

`@RestController` 는 `@Controller` 와 `@ResponseBody` 를 합친 것이라, 메서드가 돌려준 객체가 JSON 으로 바뀌어 응답 본문에 들어간다.

## 요청에서 값 꺼내기

- `@PathVariable Long id` — 주소의 `{id}` 부분. 숫자가 아니면 400 으로 응답한다.
- `@RequestBody PostRequest request` — JSON 본문을 객체로 바꾼다. record 로 만들면 짧다.
- `@Valid` — `PostRequest` 필드에 붙은 `@NotBlank` 같은 검증을 돌린다. 실패하면 컨트롤러 코드에 오기 전에 400 으로 끝난다. 검증에는 `spring-boot-starter-validation` 이 필요하다.

## 응답 상태 코드 정하기

- 그냥 객체를 돌려주면 **200 OK**.
- 만들기는 **201 Created** 와 새 자원의 주소(`Location` 헤더)를 주는 것이 REST 관례다. `ResponseEntity.created(uri).body(...)` 가 둘을 한 번에 만든다.
- 지우기처럼 돌려줄 본문이 없으면 `@ResponseStatus(HttpStatus.NO_CONTENT)` 로 **204**.

## 생성자 주입

`private final` 필드와 생성자 하나로 의존성을 받는다. 생성자가 하나뿐이면 `@Autowired` 는 붙이지 않아도 된다. 필드 주입(`@Autowired private PostService postService;`)보다 나은 점:

- 필드가 `final` 이라 한 번 정해지면 바뀌지 않는다.
- 시험할 때 `new PostController(fakeService)` 처럼 가짜를 바로 넣을 수 있다.
- 의존성이 많아지면 생성자가 길어져 "이 클래스가 너무 많은 일을 한다"는 신호가 바로 보인다.

## 자주 하는 실수

- **엔티티를 그대로 응답하기** — JPA 엔티티를 바로 돌려주면 내부 필드가 노출되고 지연 로딩 문제가 생긴다. 이 세트처럼 응답용 record(`PostResponse`)로 바꿔 돌려준다.
- **`@RequestBody` 빠뜨리기** — 붙이지 않으면 JSON 본문을 읽지 않아 필드가 모두 null 이 된다.

## 더 읽기

- [Spring 가이드 — Building a RESTful Web Service](https://spring.io/guides/gs/rest-service)
- [Spring Framework 레퍼런스](https://docs.spring.io/spring-framework/reference/)
