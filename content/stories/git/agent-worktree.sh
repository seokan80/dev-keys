# 에이전트 작업 격리 — content/sets/git/agent-worktree.yaml 의 출력을 뽑는 이야기.
# ~/devkeys(main)에서 AI 에이전트 둘에게 일을 맡긴다. 작업 하나 = 브랜치 하나 = worktree 하나.
# 에이전트들은 각자 옆 폴더에서 커밋하고, 나는 검토해서 차례로 합친 뒤 폴더와 브랜치를 정리한다.

quiet 'git config --global user.name "Kim Dev"'
quiet 'git config --global user.email "dev@example.com"'
quiet 'git config --global init.defaultBranch main'
quiet 'git init'

at() {
  git add -A
  GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1" git commit -q -m "$2"
}
quiet 'printf "# DevKeys\n" > README.md && at "2026-10-10T10:00:00+09:00" "docs: add README"'
quiet 'printf "<form id=\"login\"></form>\n" > login.html && at "2026-10-14T16:05:00+09:00" "feat: add login page"'

run 'git worktree add ../devkeys-search -b agent/search'
run 'git worktree add ../devkeys-login -b agent/login-fix'
run 'git worktree list'

# 에이전트들이 각자 폴더에서 커밋한다 (치지 않음)
quiet 'cd ../devkeys-search && printf "<input id=\"q\">\n" > search.html && at "2026-10-17T10:30:00+09:00" "feat: add search box"'
quiet 'cd ../devkeys-login && printf "<form id=\"login\" method=\"post\"></form>\n" > login.html && at "2026-10-17T10:40:00+09:00" "fix: post login form"'

run 'git branch -v'
run 'git diff main...agent/login-fix --stat'
run 'git merge agent/login-fix'
run 'git worktree remove ../devkeys-login'
run 'git branch -d agent/login-fix'
run 'git merge --no-ff agent/search'
run 'git worktree remove ../devkeys-search'
run 'git branch -d agent/search'
run 'git worktree list'
run 'git log --oneline --graph'
