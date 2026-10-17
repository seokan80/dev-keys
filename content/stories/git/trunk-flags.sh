# 트렁크 기반과 기능 플래그 — content/sets/git/trunk-flags.yaml 의 출력을 뽑는 이야기.
# 검색 기능을 플래그를 끈 채 main 에 작게 여러 번 합치고, 다 되면 플래그를 켜는 커밋 하나로 연다.
# 릴리스는 main 에 태그. 1.3 에 급한 수정이 필요해지면 그때 태그에서 release/1.3 을 따고, 수정은 main 에 먼저 → cherry-pick -x.
# 다 쓴 플래그는 지운다.
# 원격은 연습용 서버 저장소(~/server/devkeys.git)이고, https://github.com/kim/ 주소가 그쪽을 가리키게 했다(insteadOf).

quiet 'git config --global user.name "Kim Dev"'
quiet 'git config --global user.email "dev@example.com"'
quiet 'git config --global init.defaultBranch main'
quiet 'git config --global push.autoSetupRemote true'
quiet 'git config --global pull.rebase true'
quiet 'git init -q --bare ~/server/devkeys.git'
quiet 'git config --global url.file://$HOME/server/.insteadOf https://github.com/kim/'
rename 'file:///home/kim/server/' 'https://github.com/kim/'

# 운영 중인 서비스, 기능 플래그 파일이 있다 (치지 않음)
quiet 'git init -q && printf "# DevKeys\n" > README.md && printf "{ \"search\": false }\n" > flags.json && git add -A && git commit -q -m "chore: add feature flags" && git remote add origin https://github.com/kim/devkeys.git && git push -q -u origin main'

run 'cat flags.json'
quiet 'printf "<input id=\"q\" hidden>\n" > search.html && git add -A'
run 'git commit -m "feat(search): add search box behind flag"'
run 'git pull'
run 'git push'
quiet 'printf "export const search = (q) => fetch(\"/api/search?q=\" + q)\n" > search.js && git add -A'
run 'git commit -m "feat(search): query api behind flag"'
run 'git push'
quiet 'printf "{ \"search\": true }\n" > flags.json'
run 'git commit -am "feat(search): turn on search"'
run 'git tag -a v1.3.0 -m "Release 1.3.0"'
run 'git push --follow-tags'

# 다음 기능을 플래그 뒤에서 합쳤다 (치지 않음)
quiet 'printf "<ol id=\"ranking\" hidden></ol>\n" > ranking.html && git add -A && git commit -q -m "feat(ranking): add ranking behind flag" && git push -q'

# 1.3 에서 검색어에 & 가 들어가면 깨진다 — main 에는 아직 내보내지 않은 랭킹이 있다
run 'git switch -c release/1.3 v1.3.0'
run 'git switch main'
quiet 'printf "export const search = (q) => fetch(\"/api/search?q=\" + encodeURIComponent(q))\n" > search.js'
run 'git commit -am "fix(search): encode query"'
run 'git push'
run 'git switch release/1.3'
run 'git cherry-pick -x main'
run 'git log -1'
run 'git tag -a v1.3.1 -m "Release 1.3.1"'
run 'git push --follow-tags'

# 검색 플래그는 이제 필요 없다
run 'git switch main'
quiet 'printf "{}\n" > flags.json && printf "<input id=\"q\">\n" > search.html'
run 'git commit -am "chore(search): remove flag"'
run 'git push'
run 'git log --reflog --format="%h %s"'
