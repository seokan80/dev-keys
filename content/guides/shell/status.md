# 종료 상태와 조건 실행

서비스 로그와 설정 파일을 확인해 릴리스를 진행할지 판단한다. 명령의 출력과 종료 상태는 별개다. 각 세트는 새 초기 상태에서 시작하며 화면 오른쪽의 **종료 상태**를 함께 본다.

## 바로 전 결과 읽기

`true`는 0, `false`는 1이다. `printf "%s\n" "$?"`는 바로 전 명령의 상태를 출력한다. printf를 실행한 뒤 `$?`는 그 printf의 상태로 바뀌므로, 관심 있는 상태는 다른 명령 전에 바로 읽어야 한다.

GNU grep은 일반적으로 0이면 일치, 1이면 일치 없음, 2이면 오류다. 이야기의 `grep -q "FATAL"`은 정상적으로 파일을 읽었지만 일치가 없어 1이다.

## &&, ||, if

| 표현               | 다음 명령이 실행되는 조건 |
| ------------------ | ------------------------- |
| `a && b`           | a가 0                     |
| `a                 |                           | b`  | a가 0이 아님 |
| `if a; then b; fi` | a가 0                     |

`grep -q "ERROR" ... && printf "review logs\n"`는 오류 줄이 있을 때만 안내한다. ERROR라는 글자를 찾는 grep 자체는 성공했으므로 상태 0이다.

이야기에서 FATAL 검색 뒤 `||`가 출력하는 no fatal은 파일이 정상적으로 읽혔다는 전제다. **일반적으로 `||`는 일치 없음뿐 아니라 파일 읽기 오류에도 실행된다.** 실제 자동화에서 둘을 구분해야 한다면 상태 1과 2를 따로 처리해야 한다. `&&`·`||` 조합을 모든 경우의 if/else 대체로 생각하지 않는다.

## 파이프 전체의 상태

```sh
false | true
```

기본 상태는 마지막 true의 0이다. 앞의 false가 자동으로 파이프 전체를 실패시키지 않는다.

`PIPESTATUS`는 파이프 각 명령의 상태 배열이다. 다른 명령이 배열을 바꾸기 전에 이야기처럼 **같은 줄에서 바로** 읽으면 `1 0`을 확인할 수 있다.

```sh
set -o pipefail
false | true
```

이제 전체 상태는 1이다. pipefail은 모든 명령이 0이면 0, 아니면 **가장 오른쪽에서 실패한 명령의 상태**를 사용한다. 다음 작업에 영향을 남기지 않도록 마지막에 `set +o pipefail`로 끈다. pipefail만으로 스크립트가 자동 종료되는 것은 아니다. `set -e`는 별개의 동작이며 이번 세트에서는 다루지 않는다.

[Bash 종료 상태](https://www.gnu.org/software/bash/manual/html_node/Exit-Status.html), [파이프와 pipefail](https://www.gnu.org/software/bash/manual/html_node/Pipelines), [GNU grep 상태](https://www.gnu.org/software/grep/manual/html_node/Exit-Status.html).
