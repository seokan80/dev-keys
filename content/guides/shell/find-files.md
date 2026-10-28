# find로 파일 찾기

서비스 파일에서 로그·소스·설정을 찾고 임시 파일을 정리한다. 각 세트는 새 초기 상태에서 시작한다. cache 속 `bundle.js`도 소스 확장자를 가지므로 검색 범위를 직접 정해야 한다.

## 검색 범위를 먼저 정하기

`find project`의 project는 시작 경로다. `-type f`는 일반 파일, `-type d`는 디렉터리다. 디렉터리 검색에는 시작 경로 자체도 포함된다. `-maxdepth 1`은 바로 아래까지만 탐색한다.

`find`는 기본적으로 숨은 파일도 탐색한다. `-name ".*"`으로 `.gitignore`를 찾을 수 있다. `-iname`은 이름의 대소문자를 구분하지 않는다.

## 이름 패턴은 find에 전달하기

```sh
find project -type f -name "*.log" -print | sort
```

따옴표가 없으면 Bash가 현재 디렉터리에서 `*.log`를 먼저 펼칠 수 있다. 따옴표로 감싸 find가 이름 패턴으로 받도록 한다. 결과 순서는 보장되지 않으므로 이야기의 목록 출력은 `sort`로 정렬했다. 일반 파일명에 줄바꿈이 있을 수 있는 자동화에서는 줄 단위 처리 대신 `-print0` 같은 NUL 구분을 검토한다. 이 연습의 파일 이름에는 줄바꿈이 없다.

`-perm 600`은 권한 비트가 정확히 600인 항목이다. 이 이야기에서는 준비 코드가 app.env만 그 권한으로 만든다. `-empty`는 비어 있는 파일을 고를 때 쓴다.

## 찾은 파일에 명령 실행하기

```sh
find project -type f -name "app.log" -exec wc -l {} \;
```

`{}`는 찾은 경로다. `\;`는 세미콜론을 Bash가 먼저 명령 구분자로 소비하지 않도록 한다. `-exec` 뒤 명령은 각각의 파일에 실행된다.

## cache를 건너뛰고 tmp 정리하기

```sh
find project -path "*/cache" -prune -o -type f -print | sort
```

cache를 만나면 그 안으로 내려가지 않는다. `-o` 오른쪽은 다른 경로 중 일반 파일만 출력한다. 괄호와 `-o`의 결합을 바꾸면 선택 범위도 달라질 수 있다.

삭제는 `project/tmp`로 범위를 좁혀 **같은 조건으로 목록을 확인한 뒤** `-delete`로 실행한다. `-delete`는 실제 삭제다. 이 세트에서 `-prune`과 `-delete`를 조합하지 않으며, 삭제 후 다시 목록을 확인한다. 브라우저에서는 연습용 상태만 바뀐다.

[GNU Findutils](https://www.gnu.org/software/findutils/manual/html_mono/find.html).
