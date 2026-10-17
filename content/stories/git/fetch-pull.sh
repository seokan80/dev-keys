# fetch 와 pull — content/sets/git/fetch-pull.yaml 의 출력을 뽑는 이야기.
# 동료 lee 와 같은 GitHub 저장소(kim/devkeys)에서 일한다. lee 가 올린 것을 받아 보고(fetch) 합치고(pull),
# 서로 다른 커밋을 쌓아 갈라졌을 때 pull --rebase 로 잇고, lee 가 올린 새 브랜치로 옮겨 간다.
# 원격은 연습용 서버 저장소(~/server/devkeys.git)이고, https://github.com/kim/ 주소가 그쪽을 가리키게 했다(insteadOf).
#   GitHub 에서 받아 오면 서버 쪽 압축 상태에 따라 remote: 줄의 숫자가 실행마다 달라서, 받아 오기가 중심인 세트는 이렇게 돌린다.

quiet 'git config --global user.name "Kim Dev"'
quiet 'git config --global user.email "dev@example.com"'
quiet 'git config --global init.defaultBranch main'
quiet 'git init -q --bare ~/server/devkeys.git'
quiet 'git config --global url.file://$HOME/server/.insteadOf https://github.com/kim/'
rename 'file:///home/kim/server/' 'https://github.com/kim/'

# 앞 세트까지: ~/devkeys 를 GitHub 에 올려 두었다 (치지 않음)
quiet 'git init -q && printf "# DevKeys\n" > README.md && git add -A && git commit -q -m "docs: add README"'
quiet 'printf "<form id=\"login\"></form>\n" > login.html && git add -A && git commit -q -m "feat: add login page"'
quiet 'git remote add origin https://github.com/kim/devkeys.git && git push -q -u origin main'
# 동료 lee 도 같은 저장소를 받아 둔다 (치지 않음)
quiet 'git clone -q https://github.com/kim/devkeys.git ~/lee/devkeys && git -C ~/lee/devkeys config user.name "Lee Dev" && git -C ~/lee/devkeys config user.email "lee@example.com"'
lee() { quiet "cd ~/lee/devkeys && $1"; }

# lee 가 회원가입 화면을 올렸다
lee 'printf "<form id=\"signup\"></form>\n" > signup.html && git add -A && git commit -q -m "feat: add signup page" && git push -q'
run 'git status'
run 'git fetch'
run 'git status'
run 'git log --oneline main..origin/main'
run 'git diff --stat main origin/main'
run 'git pull'

# 나는 README 를, lee 는 검색창을 각자 커밋했다 — lee 가 먼저 올렸다
quiet 'printf "# DevKeys\nTyping practice for developers\n" > README.md && git commit -q -am "docs: describe the project"'
lee 'printf "<input id=\"q\">\n" > search.html && git add -A && git commit -q -m "feat: add search box" && git push -q'
run 'git fetch'
run 'git status'
run 'git pull'
run 'git pull --ff-only'
run 'git pull --rebase'
run 'git log --oneline --graph -4'
run 'git push'
run 'git config --global pull.rebase true'

# lee 가 새 브랜치를 올렸다
lee 'git switch -q -c feature/profile && printf "<h1>Profile</h1>\n" > profile.html && git add -A && git commit -q -m "feat: add profile page" && git push -q -u origin feature/profile'
run 'git fetch'
run 'git branch -r'
run 'git switch feature/profile'
run 'git branch -vv'
run 'git log --oneline --graph --all -5'
run 'git remote show origin'

# main 에서 README 를 고치던 중(커밋 전) lee 가 main 에 또 올렸다
run 'git switch main'
quiet 'printf "# DevKeys\nTyping practice for developers\n\nnpm run dev\n" > README.md'
lee 'git switch -q main && git pull -q && printf "<footer></footer>\n" > footer.html && git add -A && git commit -q -m "feat: add footer" && git push -q'
run 'git pull'
run 'git config --global rebase.autoStash true'
run 'git pull'
run 'git log --reflog --format="%h %s"'
