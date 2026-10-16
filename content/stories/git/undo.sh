# 되돌리기 — content/sets/git/undo.yaml 의 출력을 뽑는 이야기.
# ~/devkeys 에서 파일 하나를 예전 버전으로 꺼내 보고, 마지막 커밋에 빠뜨린 파일을 넣고,
# reset 세 모드를 차례로 써 본 뒤 reflog 로 잃은 커밋을 되살린다. 마지막으로 이미 push 한 커밋은 revert 로 되돌린다.

quiet 'git config --global user.name "Kim Dev"'
quiet 'git config --global user.email "dev@example.com"'
quiet 'git config --global init.defaultBranch main'
quiet 'git init'

at() {
  git add -A
  GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1" git commit -q -m "$2"
}
quiet 'printf "# DevKeys\n" > README.md && at "2026-10-10T10:00:00+09:00" "docs: add README"'
quiet 'printf "export function request(url, token) {\n  return fetch(url, { headers: { Authorization: token } })\n}\n" > api.js && at "2026-10-11T14:20:00+09:00" "feat: add api client"'
quiet 'printf "<form id=\"login\"></form>\n" > login.html && at "2026-10-14T16:05:00+09:00" "feat: add login page"'
quiet 'printf "export function request(url, token) {\n  const headers = token ? { Authorization: token } : {}\n  return fetch(url, { headers })\n}\n" > api.js && at "2026-10-15T11:30:00+09:00" "fix: skip empty token"'

run 'git log --oneline'

# ── 파일 하나만 예전 커밋 때로
run 'git restore --source=HEAD~2 api.js'
run 'git diff --stat'
run 'git restore api.js'

# ── 마지막 커밋에 빠뜨린 파일
quiet 'printf "test(\"empty token\")\n" > api.test.js'
run 'git add api.test.js'
run 'git commit --amend --no-edit'
run 'git log --oneline -2'

# ── reset 세 모드
run 'git reset --soft HEAD~1'
run 'git status --short'
run 'git reset'
run 'git status --short'
run 'git reset --hard'
run 'git status --short'
run 'git clean -n'
run 'git clean -f'

# ── 잃은 커밋 되살리기
run 'git reflog -5'
run 'git reset --hard bc99051'
run 'git log --oneline -3'

# ── 이미 push 한 커밋은 revert 로
run 'git revert --no-edit HEAD~1'
run 'git log --oneline -3'
