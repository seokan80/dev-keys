# 브랜치 만들고 합치기 — content/sets/git/branch-merge.yaml 의 출력을 뽑는 이야기.
# ~/devkeys 의 main 에서 로그인 · 회원가입 기능 브랜치를 만들어 합치고 정리한 뒤, 고치던 것을 stash 로 잠시 치운다.

quiet 'git config --global user.name "Kim Dev"'
quiet 'git config --global user.email "dev@example.com"'
quiet 'git config --global init.defaultBranch main'
quiet 'git init'
quiet 'printf "# DevKeys\n" > README.md && git add . && git commit -q -m "docs: add README"'

run 'git branch'
run 'git branch feature/login'
run 'git switch feature/login'
quiet 'seq -f "<p>login %g</p>" 12 > login.html && git add . && git commit -q -m "feat: add login page"'
run 'git switch main'
run 'git merge feature/login'
run 'git switch -c feature/signup'
quiet 'seq -f "<p>signup %g</p>" 15 > signup.html && git add . && git commit -q -m "feat: add signup page"'
run 'git switch -'
run 'git merge --no-ff feature/signup'
run 'git log --oneline --graph'
run 'git branch --merged'
run 'git branch -d feature/login'
run 'git branch -m feature/signup feature/join'
run 'git checkout -b hotfix/typo'
run 'git switch main'
run 'git branch -D hotfix/typo'
run 'git branch'

# ── README.md 를 고치던 중 급한 일이 생겼다
quiet 'printf "# DevKeys\nTyping practice\n" > README.md'
run 'git stash'
run 'git stash list'
run 'git stash pop'
