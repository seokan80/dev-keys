# 현재 위치와 경로 익히기

시즌 2의 첫 연습이다. `~/workspace` 아래의 작은 서비스 폴더를 돌아다니며 현재 위치와 경로를 구분한다. **Bash + GNU 도구 기준**이다. 화면의 명령은 준비된 이야기이며 내 컴퓨터의 파일을 바꾸지 않는다.

각 세트는 처음 상태에서 새로 시작한다. 이 세트에는 다음 파일이 준비되어 있다.

```text
~/workspace/
  project/
    .gitignore
    config/app.env
    logs/app.log
    src/app.js
```

## 위치를 확인하고 이동하기

- `pwd`: 현재 디렉터리의 절대 경로를 출력한다.
- `cd project`: 현재 위치 아래의 project로 이동한다. 같은 명령이라도 출발 위치에 따라 뜻이 달라진다.
- `cd ..`: 부모로 한 단계 올라간다. `../..`는 두 단계다.
- `cd -`: 바로 전에 있던 위치로 돌아가며 그 경로를 출력한다. 부모로 이동하는 명령과 구분한다.
- `.`은 현재 위치다. `./src/../config`는 src로 들어갔다가 부모로 나와 config로 가는 경로다.

명령을 끝내면 오른쪽 트리의 **현재 위치**가 바뀐다. `pwd`와 `ls`는 조회이므로 파일과 현재 위치가 바뀌지 않는다.

## 이동하지 않고 목록 보기

`ls -1 project/src`는 src로 이동하지 않고 내용을 한 줄에 하나씩 보여 준다. 이름의 정렬은 이 연습의 고정된 C 로케일 기준이다.

`ls -a`는 숨은 파일과 `.`·`..`도 보여 준다. `.gitignore`가 평소 목록에 나오지 않는 이유를 확인한다. `ls -d project/*/`에서는 Bash가 `*`를 경로들로 펼치고, ls는 디렉터리의 내용 대신 그 이름을 출력한다.

## 경로에서 필요한 부분 구하기

| 명령                                                    | 결과                            |
| ------------------------------------------------------- | ------------------------------- |
| `realpath project/src/../config/app.env`                | 정리한 절대 경로                |
| `realpath --relative-to=project project/config/app.env` | project 기준의 `config/app.env` |
| `dirname project/config/app.env`                        | `project/config`                |
| `basename project/config/app.env`                       | `app.env`                       |

`realpath --relative-to`는 GNU 도구 기준이다. macOS 기본 도구와 지원 옵션이 다를 수 있다.

## 도전 모드

현재 위치 확인, 부모로 이동, 이전 위치로 복귀, 숨은 항목 보기를 설명만 보고 입력한다. Shell 문제는 따옴표와 연산자의 의미를 보존하기 위해 표시한 정답과 정확히 비교한다. 앞뒤 공백만 무시하며 가능한 다른 답은 정답 목록에 명시한다.

## 참고

[Bash 디렉터리 이동](https://www.gnu.org/software/bash/manual/html_node/Bourne-Shell-Builtins.html), [GNU Coreutils](https://www.gnu.org/software/coreutils/manual/coreutils.html).
