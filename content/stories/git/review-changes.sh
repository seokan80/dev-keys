# AI 변경 검토 — content/sets/git/review-changes.yaml 의 출력을 뽑는 이야기.
# AI 에이전트에게 "요청에 타임아웃을 넣어 줘"를 맡겼더니 api.js 에 타임아웃과 함께 디버그 로그까지 넣고,
# README 를 고치고, 메모 파일(notes.tmp)도 남겼다. 바뀐 것을 훑고 필요한 것만 골라 커밋한다.

quiet 'git config --global user.name "Kim Dev"'
quiet 'git config --global user.email "dev@example.com"'
quiet 'git config --global init.defaultBranch main'
quiet 'git init'

at() {
  git add -A
  GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1" git commit -q -m "$2"
}
quiet 'printf "# DevKeys\n" > README.md && at "2026-10-10T10:00:00+09:00" "docs: add README"'
quiet 'cat > api.js <<JS
export async function request(url, token) {
  const headers = token ? { Authorization: token } : {}
  const res = await fetch(url, { headers })
  return res.json()
}

export function search(q) {
  return request("/search?q=" + q)
}

export function login(form) {
  return request("/login", form)
}
JS
at "2026-10-15T11:30:00+09:00" "feat: add api client"'

# 에이전트가 고친 것 (치지 않음)
quiet 'cat > api.js <<JS
export async function request(url, token) {
  const headers = token ? { Authorization: token } : {}
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(5000) })
  return res.json()
}

export function search(q) {
  return request("/search?q=" + q)
}

export function login(form) {
  console.log("debug", form)
  return request("/login", form)
}
JS
printf "# DevKeys\n\nRequests time out after 5 seconds.\n" > README.md
printf "try AbortController first\n" > notes.tmp'

run 'git status --short'
run 'git diff --stat'
run 'git add -p api.js' y n
run 'git diff --staged --stat'
run 'git diff --staged'
run 'git stash push --keep-index -u -m "agent leftovers"'
run 'git status --short'
run 'git stash pop'
run 'git diff api.js'
run 'git restore -p api.js' y
run 'git add README.md'
run 'git clean -n'
run 'git clean -f'
run 'git status --short'
run 'git commit -m "feat: add request timeout" -m "Abort fetch after 5 seconds."'
run 'git show --stat HEAD'
run 'git log --oneline -3'
