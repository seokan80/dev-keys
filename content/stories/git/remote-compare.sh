# 원격과 비교하고 정리하기 — content/sets/git/remote-compare.yaml 의 출력을 뽑는 이야기.
# 내 main 과 원격 main 이 서로 앞서고 뒤처진 상태를 읽고, 파일 하나만 원격과 비교한 뒤 맞추고,
# 합쳐져 원격에서 지워진 브랜치와 오래된 브랜치를 정리한다.
# 원격은 연습용 서버 저장소(~/server/devkeys.git)이고, https://github.com/kim/ 주소가 그쪽을 가리키게 했다(insteadOf).

quiet 'git config --global user.name "Kim Dev"'
quiet 'git config --global user.email "dev@example.com"'
quiet 'git config --global init.defaultBranch main'
quiet 'git config --global pull.rebase true'
quiet 'git init -q --bare ~/server/devkeys.git'
quiet 'git config --global url.file://$HOME/server/.insteadOf https://github.com/kim/'
rename 'file:///home/kim/server/' 'https://github.com/kim/'

# 앞 세트까지 (치지 않음): main 과 오래된 브랜치 feature/old, 검색 브랜치 feature/search 를 올려 두었다
quiet 'git init -q && printf "# DevKeys\n" > README.md && git add -A && git commit -q -m "docs: add README"'
quiet 'git remote add origin https://github.com/kim/devkeys.git && git push -q -u origin main'
quiet 'git switch -q -c feature/old && printf "draft\n" > old.txt && git add -A && git commit -q -m "wip: old idea" && git push -q -u origin feature/old && git switch -q main && git branch -q -D feature/old'
quiet 'git switch -q -c feature/search && printf "<input id=\"q\">\n" > search.html && git add -A && git commit -q -m "feat: add search box" && git push -q -u origin feature/search && git switch -q main'
quiet 'git clone -q https://github.com/kim/devkeys.git ~/lee/devkeys && git -C ~/lee/devkeys config user.name "Lee Dev" && git -C ~/lee/devkeys config user.email "lee@example.com"'
lee() { quiet "cd ~/lee/devkeys && $1"; }

# lee 가 검색 브랜치를 main 에 합치고(PR 병합) 원격 브랜치를 지웠다. 이어서 footer 도 올렸다
lee 'git merge -q --no-ff origin/feature/search -m "Merge pull request #7 from kim/feature/search" && git push -q && git push -q origin --delete feature/search'
lee 'printf "<footer></footer>\n" > footer.html && git add -A && git commit -q -m "feat: add footer" && git push -q'
# 나는 main 에서 README 를 고쳐 커밋했다 (아직 올리지 않음)
quiet 'printf "# DevKeys\n\nTyping practice for developers\n" > README.md && git commit -q -am "docs: describe the project"'

run 'git fetch'
run 'git status -sb'
run 'git log --oneline origin/main..'
run 'git log --oneline ..origin/main'
run 'git log --oneline --left-right main...origin/main'
run 'git diff --stat main...origin/main'
run 'git diff origin/main -- README.md'
run 'git pull'
run 'git push'
run 'git branch -vv'
run 'git fetch --prune'
run 'git branch -vv'
run 'git branch -d feature/search'
run 'git ls-remote --heads origin'
run 'git push origin --delete feature/old'
run 'git config --global fetch.prune true'
run 'git branch -a'
run 'git log --reflog --format="%h %s"'
