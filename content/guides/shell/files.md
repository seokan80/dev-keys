# 파일과 폴더 정리하기

서비스 파일을 백업하고 임시 파일을 정리하는 연습이다. **Bash + GNU 도구 기준**이며, 첫 세트와 같은 초기 파일에서 새로 시작한다. 화면은 연습용 파일 상태만 바꾸며 내 컴퓨터의 파일을 삭제하지 않는다.

시작 위치는 `~/workspace`, 준비된 파일은 `project/src/app.js`, `project/config/app.env`, `project/logs/app.log`, `project/.gitignore`다.

## 만들기

`mkdir -p project/tmp project/backups`로 폴더 두 개를 만든다. `-p`는 없는 부모도 함께 만들고 이미 있는 디렉터리는 그대로 둔다.

`touch project/tmp/session.txt`는 없는 파일을 빈 파일로 만든다. 이미 있는 파일에 touch를 쓰면 내용을 지우지 않고 파일의 시각을 갱신한다.

## 복사와 이동 구분하기

| 명령                      | 원본                 | 결과                 |
| ------------------------- | -------------------- | -------------------- |
| `cp source destination`   | 남음                 | 대상에 복사          |
| `cp -r source directory/` | 남음                 | 디렉터리 안까지 복사 |
| `mv source destination`   | 원래 위치에서 사라짐 | 이동 또는 이름 변경  |

이야기에서 `app.js`를 `app.saved.js`로 바꾸는 것은 이름 변경이고, session.txt를 archive로 옮기는 것은 이동이다. 두 경우 모두 mv를 쓴다.

파일 트리에서 복사 뒤에는 원본과 사본이 모두 있고, 이동 뒤에는 원래 항목이 사라졌는지 확인한다. 파일 이름을 바꿔도 내용은 그대로다.

## 파일을 지우고 빈 디렉터리 정리하기

`rm`은 파일을 휴지통으로 보내지 않는다. 경로를 확인하고 지울 파일을 하나씩 지정한다. 이 연습은 `rm -rf` 없이 파일을 지운 뒤 `rmdir`로 빈 디렉터리를 정리한다.

`rmdir project/tmp`는 빈 디렉터리만 삭제한다. 파일이 남아 있으면 실패하므로 정리 범위를 확인하기 좋다. archive/src 안의 app.js를 먼저 지우고 디렉터리를 안쪽부터 지우는 순서를 익힌다.

마지막에는 백업한 app.saved.js를 src/worker.js로 복사했다가 worker.js만 삭제한다. 원래 app.js와 backups의 사본은 그대로 남는다.

## 도전 모드

디렉터리 만들기, 파일 복사, 이름 변경, 빈 디렉터리 삭제를 설명만 보고 친다. 따옴표·공백을 포함해 명시한 답을 정확히 입력한다. 앞뒤 공백은 무시한다.

## 참고

[GNU Coreutils의 파일 조작](https://www.gnu.org/software/coreutils/manual/coreutils.html).
