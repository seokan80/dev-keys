# 기록 살펴보기 — content/sets/git/log-history.yaml 의 출력을 뽑는 이야기.
# ~/devkeys 에 Kim Dev 와 동료 Lee Dev 의 커밋이 일주일 동안 쌓였다. 누가 언제 무엇을 바꿨는지 찾아본다.

quiet 'git config --global user.name "Kim Dev"'
quiet 'git config --global user.email "dev@example.com"'
quiet 'git config --global init.defaultBranch main'
quiet 'git init'

# 날짜를 정해 커밋한다: at <날짜> <작성자> <메시지>
at() {
  local when="$1" who="$2" msg="$3"
  local email; email="$(echo "${who%% *}" | tr 'A-Z' 'a-z')@example.com"
  [ "$who" = "Kim Dev" ] && email="dev@example.com"
  git add -A
  GIT_AUTHOR_DATE="$when" GIT_COMMITTER_DATE="$when" GIT_AUTHOR_NAME="$who" GIT_AUTHOR_EMAIL="$email" \
    GIT_COMMITTER_NAME="$who" GIT_COMMITTER_EMAIL="$email" git commit -q -m "$msg"
}

quiet 'printf "# DevKeys\n" > README.md && at "2026-10-10T10:00:00+09:00" "Kim Dev" "docs: add README"'
quiet 'printf "export function request(url) {\n  return fetch(url)\n}\n" > api.js && at "2026-10-11T14:20:00+09:00" "Kim Dev" "feat: add api client"'
quiet 'printf ".env\n" > .gitignore && at "2026-10-12T09:40:00+09:00" "Kim Dev" "chore: ignore .env"'
quiet 'printf "<form id=\"login\"></form>\n" > login.html && printf "export function request(url, token) {\n  return fetch(url, { headers: { Authorization: token } })\n}\n" > api.js && at "2026-10-14T16:05:00+09:00" "Lee Dev" "feat: add login page"'
quiet 'printf "export function request(url, token) {\n  const headers = token ? { Authorization: token } : {}\n  return fetch(url, { headers })\n}\n" > api.js && at "2026-10-15T11:30:00+09:00" "Kim Dev" "fix: skip empty token"'
quiet 'printf "# DevKeys\n\nLogin with your GitHub account.\n" > README.md && at "2026-10-16T18:10:00+09:00" "Lee Dev" "docs: describe login"'

run 'git log --oneline'
run 'git log --stat -1'
run 'git log --oneline --name-status -2'
run 'git log --oneline --diff-filter=A --name-only'
run 'git log --oneline --author=Lee'
run 'git log --oneline --since=2026-10-14'
run 'git log --oneline -S token'
run 'git log --oneline -- README.md'
run 'git log --format="%h %an %ad %s" --date=short -3'
run 'git shortlog -sn'
run 'git show HEAD~1'
run 'git show HEAD~2:api.js'
run 'git diff HEAD~3 HEAD --stat'
run 'git blame --date=short -L 2,3 api.js'
run 'git last-modified'
