# 원격 저장소 연결 — content/sets/git/remote-connect.yaml 의 출력을 뽑는 이야기.
# ~/devkeys 에서 만든 저장소를 GitHub 의 빈 저장소(kim/devkeys)에 처음 올리고, 브랜치를 올리고, 다른 폴더에 clone 해 본다.
# push · clone 은 연습용 GitHub 저장소에서 실제로 실행한다 (scripts/git-story-sandbox.sh).

quiet 'git config --global user.name "Kim Dev"'
quiet 'git config --global user.email "dev@example.com"'
quiet 'git config --global init.defaultBranch main'
source "$here/git-story-sandbox.sh"
sandbox_connect
sandbox_empty
# 처음 올리는 브랜치는 빈 저장소의 기본 브랜치가 되어 GitHub 가 "PR 만들기" 안내를 붙이지 않는다.
# 연습용 저장소에는 자리 브랜치(base)가 기본으로 있어서 붙는 그 안내를 지운다
rename_re "remote:\nremote: Create a pull request for 'main' on GitHub by visiting:\nremote: +https://github.com/kim/devkeys/pull/new/main\nremote:\n" ''

# 지금까지 로컬에서 만든 저장소 (치지 않음)
quiet 'git init -q && printf "# DevKeys\n" > README.md && git add -A && git commit -q -m "docs: add README"'
quiet 'printf "<form id=\"login\"></form>\n" > login.html && git add -A && git commit -q -m "feat: add login page"'

run 'git remote add origin https://github.com/kim/devkeys.git'
run 'git remote -v'
run 'git push -u origin main'
sandbox_default_main
run 'git branch -vv'
run 'git status'
run 'git switch -c feature/search'
quiet 'printf "<input id=\"q\">\n" > search.html && git add -A && git commit -q -m "feat: add search box"'
run 'git push'
run 'git push -u origin feature/search'
run 'git config --global push.autoSetupRemote true'
run 'git switch -c feature/signup'
quiet 'printf "<form id=\"signup\"></form>\n" > signup.html && git add -A && git commit -q -m "feat: add signup page"'
run 'git push'
run 'git branch -vv'

# 다른 폴더(노트북이라 치고)에 받는다.
# GitHub 에서 받으면 서버 쪽 압축 상태에 따라 remote: 줄의 숫자가 실행마다 달라서, 같은 브랜치를 연습용 서버 저장소에도
# 올려 두고 그쪽에서 받는다 (주소는 그대로 — insteadOf 만 바꾼다)
quiet 'git init -q --bare ~/server/devkeys.git && git push -q ~/server/devkeys.git main feature/search feature/signup'
quiet 'git config --global --unset url.https://github.com/seokan80/devkeys-sandbox.insteadOf && git config --global url.file://$HOME/server/.insteadOf https://github.com/kim/'
rename 'file:///home/kim/server/' 'https://github.com/kim/'
run 'git clone https://github.com/kim/devkeys.git ~/laptop/devkeys'
run 'cd ~/laptop/devkeys'
cd ~/laptop/devkeys
run 'git branch -a'
run 'git remote set-url origin git@github.com:kim/devkeys.git'
run 'git remote -v'
cd ~/devkeys
run 'git log --reflog --format="%h %s"'
