# 브랜치 실전 — content/sets/git/branch-practice.yaml 의 출력을 뽑는 이야기.
# ~/devkeys 에서 검색 기능 브랜치(feature/search)를 만들던 중:
#   main 과 무엇이 다른지 비교하고, 실수로 main 에 한 커밋을 feature/search 로 옮기고,
#   급한 수정은 worktree 로 따로 열고, 하던 일은 stash 로 치워 둔다.

quiet 'git config --global user.name "Kim Dev"'
quiet 'git config --global user.email "dev@example.com"'
quiet 'git config --global init.defaultBranch main'
quiet 'git init'

at() {
  git add -A
  GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1" git commit -q -m "$2"
}
quiet 'printf "# DevKeys\n" > README.md && at "2026-10-10T10:00:00+09:00" "docs: add README"'
quiet 'printf "export const request = (url) => fetch(url)\n" > api.js && at "2026-10-11T14:20:00+09:00" "feat: add api client"'
quiet 'git switch -q -c feature/search'
quiet 'printf "<input id=\"q\">\n" > search.html && at "2026-10-13T10:00:00+09:00" "feat: add search box"'
quiet 'printf "export const search = (q) => request(\"/search?q=\" + q)\n" > search.js && at "2026-10-14T15:00:00+09:00" "feat: query search api"'
quiet 'git switch -q main'
quiet 'printf "# DevKeys\n\nTyping practice for developers.\n" > README.md && at "2026-10-15T09:30:00+09:00" "docs: fix typo in README"'
# 실수: feature/search 에 할 커밋을 main 에 했다
quiet 'printf "export const highlight = (s) => s\n" > highlight.js && at "2026-10-16T17:00:00+09:00" "feat: highlight results"'

# ── 브랜치 비교
run 'git branch -v'
run 'git log --oneline main..feature/search'
run 'git log --oneline feature/search..main'
run 'git diff main...feature/search --stat'
run 'git branch --no-merged'

# ── 잘못된 브랜치에 한 커밋 옮기기
run 'git switch feature/search'
run 'git cherry-pick main'
run 'git switch main'
run 'git reset --hard HEAD~1'
run 'git log --oneline --graph --all'

# ── 급한 수정은 worktree 로
run 'git worktree add ../devkeys-hotfix -b hotfix/login'
run 'git worktree list'
run 'git worktree remove ../devkeys-hotfix'
run 'git branch -d hotfix/login'

# ── 하던 일 치워 두기
run 'git switch feature/search'
quiet 'printf "<input id=\"q\" placeholder=\"search\">\n" > search.html && printf "export const debounce = (f) => f\n" > debounce.js'
run 'git stash push -u -m "wip: search ui"'
run 'git stash list'
run 'git stash show --stat -u'
run 'git stash pop'
