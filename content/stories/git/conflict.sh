# 충돌 해결 — content/sets/git/conflict.yaml 의 출력을 뽑는 이야기.
# 동료 lee 와 같은 줄을 고쳐서, 올리기가 거절되고 합칠 때 충돌이 난다. merge 로 한 번, rebase 로 한 번 풀고,
# zdiff3 · rerere 를 켜 두고, 마지막에는 rebase 를 그만두고 되돌아가 본다.
# 원격은 연습용 서버 저장소(~/server/devkeys.git)이고, https://github.com/kim/ 주소가 그쪽을 가리키게 했다(insteadOf).

quiet 'git config --global user.name "Kim Dev"'
quiet 'git config --global user.email "dev@example.com"'
quiet 'git config --global init.defaultBranch main'
quiet 'git init -q --bare ~/server/devkeys.git'
quiet 'git config --global url.file://$HOME/server/.insteadOf https://github.com/kim/'
rename 'file:///home/kim/server/' 'https://github.com/kim/'

# 앞 세트까지 (치지 않음)
quiet 'git init -q && printf "# DevKeys\n\nTyping practice for developers\n" > README.md && git add -A && git commit -q -m "docs: add README"'
quiet 'printf "<form id=\"login\">\n  <button>Log in</button>\n</form>\n" > login.html && git add -A && git commit -q -m "feat: add login page"'
quiet 'git remote add origin https://github.com/kim/devkeys.git && git push -q -u origin main'
quiet 'git clone -q https://github.com/kim/devkeys.git ~/lee/devkeys && git -C ~/lee/devkeys config user.name "Lee Dev" && git -C ~/lee/devkeys config user.email "lee@example.com"'
lee() { quiet "cd ~/lee/devkeys && $1"; }

# ── 같은 줄을 고쳤다: lee 가 먼저 올렸다
lee 'sed -i "s/for developers/for developers and AI agents/" README.md && git commit -q -am "docs: mention AI agents" && git push -q'
quiet 'sed -i "s/for developers/for Korean developers/" README.md && git commit -q -am "docs: say who it is for"'
run 'git push'
run 'git pull --no-rebase'
run 'git status'
run 'cat README.md'
quiet 'printf "# DevKeys\n\nTyping practice for Korean developers and AI agents\n" > README.md'
run 'git add README.md'
run 'git commit --no-edit'
run 'git log --oneline --graph -4'
run 'git push'

# ── 충돌을 더 읽기 쉽게, 같은 충돌은 한 번만 풀게
run 'git config --global merge.conflictStyle zdiff3'
run 'git config --global rerere.enabled true'
lee 'git pull -q --no-rebase && sed -i "s/Log in/Sign in/" login.html && git commit -q -am "fix: say sign in" && git push -q'
quiet 'sed -i "s/Log in/Log in with GitHub/" login.html && git commit -q -am "feat: log in with GitHub"'
run 'git pull --rebase'
run 'git diff --name-only --diff-filter=U'
run 'cat login.html'
quiet 'printf "<form id=\"login\">\n  <button>Sign in with GitHub</button>\n</form>\n" > login.html'
run 'git add login.html'
run 'git rebase --continue'
run 'git log --oneline -3'
run 'git push'

# ── 풀다 말고 되돌아가기
lee 'git pull -q --no-rebase && sed -i "1s/.*/# DevKeys (beta)/" README.md && git commit -q -am "docs: mark beta" && git push -q'
quiet 'sed -i "1s/.*/# DevKeys 2/" README.md && git commit -q -am "docs: rename to DevKeys 2"'
run 'git pull --rebase'
run 'git rebase --abort'
run 'git status'
