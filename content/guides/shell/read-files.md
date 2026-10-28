# 파일 내용 읽기

서비스 안내·설정·로그를 필요한 범위만 읽는 연습이다. 각 세트는 새 초기 상태에서 시작한다. `project/README.md`는 12줄, `project/logs/app.log`는 8줄이며 두 파일 모두 마지막 줄바꿈이 있다. 이 세트의 명령은 파일을 바꾸지 않는다.

## 전체, 앞, 뒤

| 명령                                 | 읽는 범위           |
| ------------------------------------ | ------------------- |
| `cat project/README.md`              | 전체                |
| `head -n 4 project/README.md`        | 처음 4줄            |
| `tail -n 4 project/README.md`        | 마지막 4줄          |
| `tail -n +4 project/logs/app.log`    | 4번째 줄부터 끝까지 |
| `sed -n "4,6p" project/logs/app.log` | 4~6번째 줄          |

`tail -n 4`와 `tail -n +4`의 차이에 주의한다. `sed -n`은 자동 출력을 끄고, `p`가 지정한 줄을 출력한다.

## less로 읽을 때

실제 터미널의 `less 파일`은 긴 파일을 스크롤하며 읽는다. Space는 다음 화면, `/단어`는 검색, `n`은 다음 검색 결과, `q`는 종료다.

이 연습은 짧은 README에 `less -F -X`를 쓴다. `-F`는 내용이 한 화면에 들어오면 종료하고 `-X`는 터미널 초기화를 생략한다. 브라우저에서는 실제 실행의 출력 기록을 보여 주며, less 안의 키 조작은 받지 않는다. `tail -f`처럼 계속 기다리는 명령도 이번 세트에서는 실행하지 않는다.

## 줄 수와 바이트 수

- `wc -l`은 줄바꿈 수다. 마지막 줄바꿈이 없는 파일에서는 화면상 줄 수와 다를 수 있다.
- `wc -c`는 바이트 수다. 한글 문자 수와 같다고 가정하면 안 된다.
- `head -c`·`tail -c`도 바이트 단위다. 이 이야기의 파일은 ASCII로 준비했다.
- `cat -A`가 보여 주는 `$`는 줄 끝 표시이며 파일에 새로 적힌 문자가 아니다.
- `cat -s`는 이어지는 빈 줄을 하나로 줄여 보여 준다. 원본은 그대로다.

화면의 포트·환경 값은 연습용이다. 실제 비밀 값이 든 설정 파일은 복사해 공유하지 않는다.

[GNU Coreutils](https://www.gnu.org/software/coreutils/manual/coreutils.html), [GNU sed](https://www.gnu.org/software/sed/manual/sed.html).
