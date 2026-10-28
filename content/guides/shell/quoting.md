# 따옴표와 변수

공백이 있는 `project/notes/release notes.txt`와 로그 패턴으로 따옴표의 차이를 확인한다. 각 세트는 새 초기 상태에서 시작한다.

## 변수 대입과 확장

```sh
file='project/notes/release notes.txt'
cat "$file"
```

대입의 `=` 양옆에는 공백을 넣지 않는다. 값을 사용할 때 큰따옴표로 감싸면 공백이 있는 경로도 하나의 인자로 전달된다.

| 표현      | 결과                                                  |
| --------- | ----------------------------------------------------- |
| `"$file"` | 값을 확장하고 하나의 인자로 보존                      |
| `'$file'` | `$file`이라는 글자 그대로                             |
| `$file`   | 값을 확장한 뒤 단어 분리·파일명 확장도 일어날 수 있음 |

이야기의 `printf "<%s>\n"`은 인자마다 꺾쇠 한 쌍을 붙인다. 따옴표를 뺀 경로가 둘로 나뉘는 것을 비교한다. 파일 경로에는 일반적으로 `"$file"`처럼 큰따옴표를 쓴다.

## 별표가 언제 펼쳐지는가

`pattern='project/logs/*.log'`는 패턴 자체를 값으로 저장한다. `"$pattern"`을 출력하면 별표가 그대로 남고, 따옴표 밖 `$pattern`은 실제 로그 파일 이름들로 펼쳐진다.

이 동작 때문에 `find -name "*.log"`나 grep의 패턴처럼 **도구가 패턴을 받아야 하는 자리**에서는 Bash가 먼저 펼치지 않게 인용한다.

## 기본값·명령 치환·환경 변수

- `${label:-draft}`는 label이 없거나 빈 값이면 draft를 사용한다. 이 표현 자체는 label에 값을 대입하지 않는다.
- `lines=$(wc -l < project/logs/app.log)`는 표준 출력을 변수로 받는다. 뒤의 줄바꿈은 제거된다.
- `"config/${name}.env"`처럼 중괄호를 쓰면 변수 이름의 경계를 분명히 할 수 있다.
- `export APP_ENV=staging`은 이후 자식 프로세스의 환경에도 값을 넘긴다. 자식이 부모의 변수를 자동으로 바꾸는 것은 아니다.

마지막 명령의 `bash -c` 코드 전체를 작은따옴표로 감싸는 이유는 바깥 Bash가 APP_ENV를 먼저 확장하지 않고 자식 Bash가 읽게 하기 위해서다.

## 도전 모드

Shell 도전은 앞뒤 공백만 무시하고 명시한 정답과 비교한다. 큰따옴표와 작은따옴표를 무조건 동의어로 취급하지 않는다. `cat "$file"`과 `cat "${file}"`처럼 같은 결과임을 확인한 답은 정답 목록에 각각 넣는다.

[Bash 인용 규칙](https://www.gnu.org/software/bash/manual/html_node/Quoting.html), [매개변수 확장](https://www.gnu.org/software/bash/manual/html_node/Shell-Parameter-Expansion.html), [명령 치환](https://www.gnu.org/software/bash/manual/html_node/Command-Substitution.html).
