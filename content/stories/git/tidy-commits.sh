# 커밋 정리 — content/sets/git/tidy-commits.yaml 의 출력을 뽑는 이야기.
# 올리기 전에 검색 기능 브랜치의 지저분한 커밋(wip · 오타 수정 · 디버그)을 rebase -i 로 정리하고,
# 나중에 찾은 실수는 --fixup + --autosquash 로 그 커밋에 합치고, 쌓아 둔 브랜치 둘을 --update-refs 로 함께 옮긴다.
# rebase -i 의 편집기는 이야기에서 GIT_SEQUENCE_EDITOR 로 대신 고친다 (세트의 해설에 무엇을 고쳤는지 적었다).

quiet 'git config --global user.name "Kim Dev"'
quiet 'git config --global user.email "dev@example.com"'
quiet 'git config --global init.defaultBranch main'
quiet 'git init -q && printf "# DevKeys\n" > README.md && git add -A && git commit -q -m "docs: add README"'
# 검색 기능을 만들며 쌓인 커밋 (치지 않음)
quiet 'git switch -q -c feature/search && printf "<input id=\"q\">\n" > search.html && git add -A && git commit -q -m "feat: add search box"'
quiet 'printf "<input id=\"q\" placeholder=\"Search\">\n" > search.html && git commit -q -am "wip"'
quiet 'printf "<input id=\"q\" placeholder=\"Search...\">\n" > search.html && git commit -q -am "fix typo"'
quiet 'printf "export const search = (q) => fetch(\"/api/search?q=\" + q)\n" > search.js && git add -A && git commit -q -m "feat: query search api"'
quiet 'printf "console.log(\"debug\")\n" >> search.js && git commit -q -am "debug: log queries"'

run 'git log --oneline main..'
run 'git log --oneline --reverse main..'
# 편집기에서: wip · fix typo 는 fixup, debug 는 drop
export GIT_SEQUENCE_EDITOR="sed -i -e '2s/^pick/fixup/' -e '3s/^pick/fixup/' -e '5s/^pick/drop/'"
run 'git rebase -i main'
unset GIT_SEQUENCE_EDITOR
run 'git log --oneline main..'
run 'git show --stat HEAD~1'

# 나중에 검색창에 이름표가 빠진 것을 찾았다
quiet 'printf "<label for=\"q\">Search</label>\n<input id=\"q\" placeholder=\"Search...\">\n" > search.html'
run 'git add search.html'
run 'git commit --fixup=HEAD~1'
run 'git log --oneline main..'
run 'git rebase -i --autosquash main'
run 'git log --oneline main..'
run 'git config --global rebase.autoSquash true'

# 검색 결과 화면을 검색 브랜치 위에 쌓아 만든다 (치지 않음)
quiet 'git switch -q -c feature/search-results && printf "<ul id=\"results\"></ul>\n" > results.html && git add -A && git commit -q -m "feat: show search results"'
quiet 'printf "export const search = (q) => fetch(\"/api/search?q=\" + encodeURIComponent(q))\n" > search.js'
run 'git commit -a --fixup=feature/search'
run 'git rebase --autosquash --update-refs main'
run 'git log --oneline --graph main..'
run 'git config --global rebase.updateRefs true'
