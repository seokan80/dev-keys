# 올린 커밋 고치기 — content/sets/git/rewrite-pushed.yaml 의 출력을 뽑는 이야기.
# 이미 올린 내 브랜치(feature/search)의 커밋을 고쳐 다시 올린다: 보통 push 는 거절되고 --force-with-lease 로 올린다.
# range-diff 로 고치기 전후를 견주고, 같은 브랜치에 lee 가 올린 커밋을 지우지 않게 lease 가 막는 것을 본다.
# 원격은 연습용 서버 저장소(~/server/devkeys.git)이고, https://github.com/kim/ 주소가 그쪽을 가리키게 했다(insteadOf).

quiet 'git config --global user.name "Kim Dev"'
quiet 'git config --global user.email "dev@example.com"'
quiet 'git config --global init.defaultBranch main'
quiet 'git init -q --bare ~/server/devkeys.git'
quiet 'git config --global url.file://$HOME/server/.insteadOf https://github.com/kim/'
rename 'file:///home/kim/server/' 'https://github.com/kim/'

# 앞 세트까지 (치지 않음): 검색 브랜치를 올려 PR 을 열어 두었다
quiet 'git init -q && printf "# DevKeys\n" > README.md && git add -A && git commit -q -m "docs: add README" && git remote add origin https://github.com/kim/devkeys.git && git push -q -u origin main'
quiet 'git switch -q -c feature/search && printf "<input id=\"q\">\n" > search.html && git add -A && git commit -q -m "feat: add search box"'
quiet 'printf "export const search = (q) => fetch(\"/api/search?q=\" + q)\n" > search.js && git add -A && git commit -q -m "feat: qeury search api" && git push -q -u origin feature/search'
quiet 'git clone -q https://github.com/kim/devkeys.git ~/lee/devkeys && git -C ~/lee/devkeys config user.name "Lee Dev" && git -C ~/lee/devkeys config user.email "lee@example.com"'
lee() { quiet "cd ~/lee/devkeys && $1"; }

# ── 메시지 오타를 고쳐 다시 올린다
run 'git commit --amend -m "feat: query search api"'
run 'git status'
run 'git push'
run 'git push --force-with-lease'
run 'git range-diff main origin/feature/search@{1} HEAD'

# ── lee 가 같은 브랜치에 테스트를 올렸다. 나는 모르고 커밋을 또 고친다
lee 'git fetch -q && git switch -q feature/search && printf "test(\"search\")\n" > search.test.js && git add -A && git commit -q -m "test: add search test" && git push -q'
quiet 'printf "export const search = (q) => fetch(\"/api/search?q=\" + encodeURIComponent(q))\n" > search.js && git add -A'
run 'git commit --amend --no-edit'
run 'git push --force-with-lease'
run 'git fetch'
run 'git log --oneline HEAD..origin/feature/search'
run 'git cherry-pick origin/feature/search'
run 'git push --force-with-lease'
run 'git log --oneline main..'
run 'git status -sb'
run 'git config --global push.useForceIfIncludes true'
run 'git log --reflog --format="%h %s"'
