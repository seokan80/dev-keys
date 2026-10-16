## Stream 은 "무엇을 할지"를 이어 쓴다

`for` 문은 어떻게 돌지를 적고, Stream 은 무엇을 할지를 적는다. `stream()` 으로 시작해 **중간 연산**(filter, map, sorted …)을 이어 붙이고 **최종 연산**(toList, sum, collect …)으로 끝낸다. 최종 연산을 부르기 전에는 아무 일도 일어나지 않는다.

```java
orders.stream()                 // 시작
    .filter(...)                // 중간: 거르기
    .map(...)                   // 중간: 바꾸기
    .toList();                  // 최종: 결과 만들기
```

## 이 세트에서 쓴 것

| 연산                       | 하는 일                              | 결과     |
| -------------------------- | ------------------------------------ | -------- |
| `filter`                   | 조건에 맞는 것만 남긴다              | Stream   |
| `map`                      | 하나씩 다른 값으로 바꾼다            | Stream   |
| `distinct` · `sorted`      | 중복 제거 · 정렬                     | Stream   |
| `toList()`                 | List 로 모은다 (Java 16+, 수정 불가) | List     |
| `mapToInt(...).sum()`      | 숫자 Stream 으로 바꿔 더한다         | int      |
| `collect(groupingBy(...))` | 키별로 묶는다                        | Map      |
| `collect(joining(...))`    | 문자열로 잇는다                      | String   |
| `max(comparator)`          | 가장 큰 것                           | Optional |

## 자주 하는 실수

- **`toList()` 결과에 `add` 하기** — `Stream.toList()` 는 수정할 수 없는 List 를 돌려주므로 `UnsupportedOperationException` 이 난다. 수정할 List 가 필요하면 `collect(Collectors.toCollection(ArrayList::new))`.
- **Stream 을 두 번 쓰기** — Stream 은 한 번만 소비된다. 이 세트처럼 필요할 때마다 `orders.stream()` 을 새로 부른다.
- **`max` 결과에 바로 `.get()`** — 비어 있으면 예외가 난다. `orElseThrow()` 나 `ifPresent` 로 비어 있는 경우를 드러내 다룬다.
- **문자열 비교에 `==`** — 내용 비교는 `equals`. `"PAID".equals(status)` 처럼 상수를 앞에 두면 null 도 안전하다.

## 더 읽기

- [java.util.stream 패키지 설명](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/package-summary.html)
- [Collectors](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/Collectors.html)
