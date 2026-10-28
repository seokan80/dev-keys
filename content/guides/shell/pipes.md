# 파이프와 리다이렉션

API·worker 로그에서 오류 보고서를 만드는 이야기다. 각 세트는 새 초기 상태에서 시작한다. 앞에서 만든 보고서를 이어받지 않는다.

## 표준 입력·출력·오류

| 표현      | 연결                                          |
| --------- | --------------------------------------------- |
| `a        | b`                                            | a의 표준 출력 → b의 표준 입력 |
| `> file`  | 표준 출력을 파일로, 기존 내용은 비움          |
| `>> file` | 표준 출력을 파일 뒤에 추가                    |
| `< file`  | 파일을 표준 입력으로                          |
| `2> file` | 표준 오류를 파일로                            |
| `2>&1`    | 그 시점의 표준 출력 연결을 표준 오류에도 적용 |

`grep "ERROR" project/logs/app.log | wc -l`은 ERROR가 있는 줄 수를 센다. 파이프는 표준 오류까지 자동으로 연결하지 않는다.

`cut -d " " -f 1 ... | sort | uniq -c`는 수준 열을 뽑고 정렬한 뒤 같은 줄을 묶어 센다. `uniq`는 이웃한 같은 줄만 묶으므로 정렬 순서가 중요하다.

## 보고서 만들고 확인하기

`>`로 API 오류를 저장한 뒤 `>>`로 worker 오류를 덧붙인다. 각각 다음 cat 명령으로 실제 내용을 확인한다. `wc -l < project/errors.txt`처럼 입력 연결을 사용하면 wc에 파일 이름 인자가 없어 수만 출력된다.

`tee project/warnings.txt`는 받은 내용을 화면과 파일에 함께 쓴다. `tee`도 기본은 기존 파일을 덮어쓰며 추가하려면 `-a`가 필요하다.

## 연결 순서가 결과를 바꾼다

```sh
cat project/config/missing.env > project/stdout.txt 2>&1
cat project/config/missing.env 2>&1 > project/empty.txt
```

첫 줄은 표준 출력을 파일로 보낸 뒤 오류도 같은 파일로 보낸다. 터미널 출력은 없고, 파일에서 오류 메시지를 읽게 된다.

둘째 줄은 표준 오류를 원래 표준 출력에 연결한 뒤 표준 출력만 파일로 바꾼다. 오류는 화면에 나오고 empty.txt는 비어 있다. 리다이렉션은 왼쪽에서 오른쪽으로 처리된다.

두 경우 모두 cat의 종료 상태는 1이다. 오류가 화면에서 사라졌다고 명령이 성공한 것은 아니다. `>`는 명령 실행 전에 파일을 비우므로 **입력으로 읽을 파일을 같은 명령의 출력 대상으로 지정하지 않는다.**

[Bash 파이프](https://www.gnu.org/software/bash/manual/html_node/Pipelines), [Bash 리다이렉션](https://www.gnu.org/software/bash/manual/html_node/Redirections.html).
