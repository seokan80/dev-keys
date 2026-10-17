# Fork 와 upstream — content/sets/git/fork-upstream.yaml 의 출력을 뽑는 이야기.
# 오픈소스 프로젝트(devkeys-org/devkeys)를 GitHub 에서 내 계정으로 fork(kim/devkeys)한 뒤, 내 fork 를 받아
# 원본을 upstream 으로 등록하고, upstream 최신에서 브랜치를 따 내 fork 에 올린다(PR 은 원본으로).
# 원본이 앞서가면 내 fork 의 main 을 맞추고, main 은 upstream 에서 받고 origin 에 올리게 짝을 나눈다. 오래된 PR 브랜치는 upstream 위로 옮긴다.
# 원격은 연습용 서버 저장소(~/server/<계정>/<저장소>.git)이고, https://github.com/ 주소가 그쪽을 가리키게 했다(insteadOf).

quiet 'git config --global user.name "Kim Dev"'
quiet 'git config --global user.email "dev@example.com"'
quiet 'git config --global init.defaultBranch main'
quiet 'git config --global url.file://$HOME/server/.insteadOf https://github.com/'
rename 'file:///home/kim/server/' 'https://github.com/'

# 원본 프로젝트 (관리자 park) — 그리고 GitHub 에서 "Fork" 를 눌러 만든 내 fork (치지 않음)
park() { quiet "cd ~/park/devkeys && $1"; }
quiet 'git init -q --bare ~/server/devkeys-org/devkeys.git'
quiet 'git clone -q https://github.com/devkeys-org/devkeys.git ~/park/devkeys 2>/dev/null; cd ~/park/devkeys && git config user.name "Park Maintainer" && git config user.email "park@example.com"'
park 'printf "# DevKeys\n\nTyping practise for developers\n" > README.md && git add -A && git commit -q -m "docs: add README" && git push -q origin main'
park 'printf "<form id=\"login\"></form>\n" > login.html && git add -A && git commit -q -m "feat: add login page" && git push -q'
quiet 'mkdir -p ~/server/kim && git clone -q --bare ~/server/devkeys-org/devkeys.git ~/server/kim/devkeys.git'

cd ~
run 'git clone https://github.com/kim/devkeys.git'
run 'cd devkeys'
cd devkeys
run 'git remote add upstream https://github.com/devkeys-org/devkeys.git'
run 'git remote -v'
run 'git fetch upstream'
run 'git switch -c fix/readme-typo upstream/main'
quiet 'sed -i "s/practise/practice/" README.md'
run 'git commit -am "docs: fix typo in README"'
run 'git push -u origin fix/readme-typo'

# 그새 원본에 다른 PR 들이 합쳐졌다
park 'printf "<form id=\"signup\"></form>\n" > signup.html && git add -A && git commit -q -m "feat: add signup page" && git push -q'
park 'printf "<input id=\"q\">\n" > search.html && git add -A && git commit -q -m "feat: add search box" && git push -q'
run 'git switch main'
run 'git fetch upstream'
run 'git log --oneline main..upstream/main'
run 'git merge --ff-only upstream/main'
run 'git push origin main'

# main 은 upstream 에서 받고 내 fork 에 올리게
run 'git branch --set-upstream-to=upstream/main'
run 'git config --global remote.pushDefault origin'
park 'printf "<footer></footer>\n" > footer.html && git add -A && git commit -q -m "feat: add footer" && git push -q'
run 'git pull'
run 'git push'
run 'git status -sb'

# PR 브랜치가 오래됐다 — 원본 최신 위로 옮긴다
run 'git switch fix/readme-typo'
run 'git rebase upstream/main'
run 'git push --force-with-lease'
run 'git log --oneline -3'
run 'git log --reflog --format="%h %s"'
