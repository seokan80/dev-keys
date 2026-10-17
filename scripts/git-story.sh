#!/usr/bin/env bash
# Git 세트의 이야기를 실제 git 으로 실행해 "$ 명령"과 출력을 찍는다 (콘텐츠 작성용).
# 홈 폴더(/home/kim) · 커밋 시각을 고정해 경로와 해시가 매번 같게 나온다. 탭은 공백으로 펼친다(세트 출력 규칙).
# 줄 끝 공백은 화면에 보이지 않으니 지운다 (log --graph 의 |/ 뒤 등).
# 내려받기 속도(… | 411.00 KiB/s)는 실행할 때마다 달라서 1.00 MiB/s 로 고정한다.
# 줄 중간의 \r 은 터미널처럼 덮어쓴다 — 편집기를 닫으면 지워지는 "hint: Waiting for your editor…" 같은 줄.
# 터미널에서 친 것과 같게 가상 터미널(script)에서 실행하고 색 코드만 지운다 — 파이프로 받으면 git 이 (HEAD -> main) 같은 표시를 뺀다.
#
#   scripts/git-story.sh content/stories/git/<슬러그>.sh
#
# 이야기 파일에서 쓰는 함수:
#   run '명령' [답 …] — 칠 명령. "$ 명령"과 출력을 찍는다. 답을 주면 대화형 질문(git add -p 등)이 뜰 때 하나씩 넣는다
#   quiet '명령'  — 이야기 속 준비(파일 만들기 · 숨은 커밋). 찍지 않는다
set -euo pipefail

story=$(realpath "$1")
here=$(dirname "$(realpath "$0")")
root=$(mktemp -d)
trap 'rm -rf "$root"' EXIT

export HOME="$root/home/kim"
mkdir -p "$HOME/devkeys"
cd "$HOME/devkeys"
# 이 셸의 git 설정(GIT_CONFIG_* · 작성자 등)이 출력에 섞이지 않게 GIT_ 로 시작하는 변수를 모두 비운다
while read -r name; do unset "$name"; done < <(compgen -e | grep '^GIT_' || true)
export GIT_CONFIG_NOSYSTEM=1 GIT_EDITOR=true GIT_PAGER=cat PAGER=cat LANG=C LC_ALL=C TZ=Asia/Seoul SHELL=/bin/bash

# 명령마다 1분씩 흐른다 (2026-10-17 09:00 KST 부터)
clock=1792195200
tick() {
  clock=$((clock + 60))
  export GIT_AUTHOR_DATE="@$clock +0900" GIT_COMMITTER_DATE="@$clock +0900"
}

run() {
  tick
  printf '\n$ %s\n' "$1"
  local command=$1
  shift
  if [ $# -gt 0 ]; then python3 "$here/pty-run.py" "$command" "$@"; else script -qec "$command" /dev/null; fi 2>&1 | sed -e 's/\x1b\[[0-9;]*[mK]//g' -e 's/\r$//' -e 's/^.*\r//' -e "s#$root##g" -e 's#| [0-9.]* [KMGT]\?i\?B/s#| 1.00 MiB/s#' | expand -t 8 | sed 's/ *$//' || true
}

quiet() {
  tick
  (eval "$1") >/dev/null 2>&1
}

git --version | sed 's/^/# /'
# shellcheck source=/dev/null
source "$story"
