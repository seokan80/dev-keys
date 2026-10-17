# 작성자 바꾸기 — content/sets/git/fix-author.yaml 의 출력을 뽑는 이야기.
# 회사 저장소에서 개인 이메일로 커밋해 버렸다. 아직 올리지 않은 커밋은 --reset-author 로 고치고,
# 이미 올린 기록은 그대로 두고 .mailmap 으로 한 사람으로 묶어 보이게 한다.

quiet 'git config --global user.name "Kim Dev"'
quiet 'git config --global user.email "kim@personal.example"'
quiet 'git config --global init.defaultBranch main'
# 회사 저장소 — 예전에 개인 이메일 · 짧은 이름으로 올린 커밋이 섞여 있다 (치지 않음)
quiet 'git init -q && printf "# DevKeys\n" > README.md && git add -A && git -c user.name=kim commit -q -m "docs: add README"'
quiet 'printf "<form id=\"login\"></form>\n" > login.html && git add -A && git -c user.email=kim@company.example commit -q -m "feat: add login page"'
quiet 'printf "<form id=\"signup\"></form>\n" > signup.html && git add -A && git commit -q -m "feat: add signup page"'
# 오늘 만든 검색 브랜치 — 아직 올리지 않았다 (치지 않음)
quiet 'git switch -q -c feature/search && printf "<input id=\"q\">\n" > search.html && git add -A && git commit -q -m "feat: add search box"'
quiet 'printf "export const search = (q) => fetch(\"/api/search?q=\" + q)\n" > search.js && git add -A && git commit -q -m "feat: query search api"'

run 'git log --format="%h %an <%ae> %s" -2'
run 'git config user.email "kim@company.example"'
run 'git commit --amend --reset-author --no-edit'
run 'git rebase --exec "git commit --amend --reset-author --no-edit" main'
run 'git log --format="%h %an <%ae> %s" main~1..'

# 이미 올린 main 의 기록
run 'git shortlog -sne main'
quiet 'printf "Kim Dev <kim@company.example>\nKim Dev <kim@company.example> <kim@personal.example>\n" > .mailmap'
run 'cat .mailmap'
run 'git shortlog -sne main'
run 'git log --format="%h %an <%ae> | %aN <%aE>" main'
run 'git check-mailmap "<kim@personal.example>"'
run 'git add .mailmap'
run 'git commit -m "chore: map old author emails"'
run 'git log --reflog --format="%h %s"'
