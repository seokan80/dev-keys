# 환경 브랜치 — content/sets/git/env-branches.yaml 의 출력을 뽑는 이야기.
# 개발 서버(dev) · 검증 서버(stage) · 운영(main) 브랜치로 운영하는 팀. 기능 브랜치는 main 에서 따서 dev 와 stage 에 각각 merge 하고,
# stage 를 main 으로 fast-forward 해 태그를 붙인다. 핫픽스는 태그에서 따서 main → stage → dev 로 내리고, dev 는 main 에서 다시 만든다.
# 마지막에 "cherry-pick 으로 올렸다면" git 이 무엇을 모르는지 본다.
# 원격은 연습용 서버 저장소(~/server/devkeys.git)이고, https://github.com/kim/ 주소가 그쪽을 가리키게 했다(insteadOf).

quiet 'git config --global user.name "Kim Dev"'
quiet 'git config --global user.email "dev@example.com"'
quiet 'git config --global init.defaultBranch main'
quiet 'git config --global push.autoSetupRemote true'
quiet 'git init -q --bare ~/server/devkeys.git'
quiet 'git config --global url.file://$HOME/server/.insteadOf https://github.com/kim/'
rename 'file:///home/kim/server/' 'https://github.com/kim/'

# 운영 중인 서비스 (치지 않음)
quiet 'git init -q && printf "# DevKeys\n" > README.md && git add -A && git commit -q -m "docs: add README" && git remote add origin https://github.com/kim/devkeys.git && git push -q -u origin main'

run 'git branch dev'
run 'git branch stage'

# ── 기능은 main 에서 딴다
run 'git switch -c feature/search main'
quiet 'printf "<input id=\"q\">\n" > search.html && git add -A && git commit -q -m "feat: add search box"'
run 'git switch dev'
run 'git merge --no-ff feature/search'
run 'git push'
run 'git switch -c feature/ranking main'
quiet 'printf "<ol id=\"ranking\"></ol>\n" > ranking.html && git add -A && git commit -q -m "feat: add ranking"'
run 'git switch dev'
run 'git merge --no-ff feature/ranking'

# ── QA: 검색만 통과했다
run 'git switch stage'
run 'git merge --no-ff feature/search'
run 'git branch --merged stage'
run 'git branch --contains feature/search'

# ── 운영 배포
run 'git switch main'
run 'git merge --ff-only stage'
run 'git tag -a v1.0.0 -m "Release 1.0.0"'
run 'git push --follow-tags'

# ── 운영에서 버그: 태그에서 따서 고치고 아래로 내린다
run 'git switch -c hotfix/login v1.0.0'
quiet 'printf "<form id=\"login\"></form>\n" > login.html && git add -A && git commit -q -m "fix: restore login form"'
run 'git switch main'
run 'git merge --no-ff hotfix/login'
run 'git switch stage'
run 'git merge --ff-only main'
run 'git switch dev'
run 'git merge main'

# ── dev 가 지저분해지면 main 에서 다시 만들고 살아 있는 기능만 다시 합친다
run 'git switch -C dev main'
run 'git merge --no-ff feature/ranking'
run 'git push --force-with-lease'

# ── 랭킹을 merge 대신 cherry-pick 으로 stage 에 올렸다면
run 'git switch stage'
run 'git cherry-pick -x feature/ranking'
run 'git branch --merged stage'
run 'git cherry -v stage feature/ranking'

run 'git log --reflog --format="%h %s"'
