# 태그와 릴리스 — content/sets/git/tags-release.yaml 의 출력을 뽑는 이야기.
# 커밋에 버전 이름표(태그)를 붙이고 올린 뒤, GitHub 릴리스를 만든다.
# push · gh 는 연습용 GitHub 저장소에서 실제로 실행한다 (scripts/git-story-sandbox.sh). 릴리스 · 태그는 돌릴 때마다 지우고 다시 만든다.

quiet 'git config --global user.name "Kim Dev"'
quiet 'git config --global user.email "dev@example.com"'
quiet 'git config --global init.defaultBranch main'
source "$here/git-story-sandbox.sh"
sandbox_connect
sandbox_empty

# 앞 세트까지 (치지 않음)
quiet 'git init -q && printf "# DevKeys\n" > README.md && git add -A && git commit -q -m "docs: add README"'
quiet 'printf "<form id=\"login\"></form>\n" > login.html && git add -A && git commit -q -m "feat: add login page"'
quiet 'printf "<input id=\"q\">\n" > search.html && git add -A && git commit -q -m "feat: add search box"'
quiet 'git remote add origin https://github.com/kim/devkeys.git && git push -q -u origin main'
sandbox_default_main

run 'git log --oneline'
run 'git tag v1.0.0 HEAD~1'
run 'git tag -a v1.1.0 -m "Release 1.1.0: search box"'
run 'git tag -n'
run 'git show --no-patch v1.1.0'
run 'git push origin v1.1.0'

# 다음 기능을 커밋했다
quiet 'printf "<ul id=\"results\"></ul>\n" > results.html && git add -A && git commit -q -m "feat: show search results"'
run 'git describe'
run 'git tag -a v1.2.0 -m "Release 1.2.0: search results"'
run 'git config --global push.followTags true'
run 'git push'
run 'git ls-remote --tags origin'
run 'gh release create v1.2.0 --generate-notes'
run 'gh release view v1.2.0 --json tagName,name,body'
run 'git tag -d v1.0.0'
run 'git tag -l "v1.*"'
run 'git log --reflog --format="%h %s"'
