# 서브모듈 — content/sets/git/submodule.yaml 의 출력을 뽑는 이야기.
# devkeys 저장소에 다른 저장소(ui-kit)를 vendor/ui-kit 으로 넣고, 다른 곳에서 함께 받고, ui-kit 새 버전으로 올린다.
# 원격은 연습용 서버 저장소(~/server/*.git)이고, https://github.com/kim/ 주소가 그쪽을 가리키게 했다(insteadOf).
#   서버 저장소를 file 주소로 쓰는 서브모듈은 git 이 기본으로 막아서(2.38.1) 이야기에서만 protocol.file.allow 를 연다.

quiet 'git config --global user.name "Kim Dev"'
quiet 'git config --global user.email "dev@example.com"'
quiet 'git config --global init.defaultBranch main'
quiet 'git config --global protocol.file.allow always'
quiet 'git init -q --bare ~/server/devkeys.git && git init -q --bare ~/server/ui-kit.git'
quiet 'git config --global url.file://$HOME/server/.insteadOf https://github.com/kim/'
rename 'file:///home/kim/server/' 'https://github.com/kim/'

# ui-kit: 디자인 팀이 따로 관리하는 저장소 (치지 않음)
quiet 'mkdir -p ~/design/ui-kit && cd ~/design/ui-kit && git init -q && printf ".btn { color: black; }\n" > button.css && git add -A && git commit -q -m "feat: add button" && git remote add origin https://github.com/kim/ui-kit.git && git push -q -u origin main'
# devkeys: 앞 세트까지 (치지 않음)
quiet 'git init -q && printf "# DevKeys\n" > README.md && git add -A && git commit -q -m "docs: add README" && git remote add origin https://github.com/kim/devkeys.git && git push -q -u origin main'

run 'git submodule add https://github.com/kim/ui-kit.git vendor/ui-kit'
run 'cat .gitmodules'
run 'git status'
run 'git diff --cached --submodule'
run 'git commit -m "chore: add ui-kit as a submodule"'
run 'git push'
run 'git submodule status'

# 노트북에서 받는다
run 'git clone https://github.com/kim/devkeys.git ~/laptop/devkeys'
run 'cd ~/laptop/devkeys'
cd ~/laptop/devkeys
run 'ls vendor/ui-kit'
run 'git submodule update --init'
run 'ls vendor/ui-kit'
run 'git clone --recurse-submodules https://github.com/kim/devkeys.git ~/desktop/devkeys'

# 디자인 팀이 ui-kit 새 버전을 올렸다
quiet 'cd ~/design/ui-kit && printf ".btn { color: white; background: black; }\n" > button.css && git commit -q -am "feat: dark button" && git push -q'
run 'cd ~/devkeys'
cd ~/devkeys
run 'git submodule update --remote'
run 'git diff --submodule'
run 'git commit -am "chore: update ui-kit"'
run 'git push'
run 'git config --global submodule.recurse true'
