# GitHub Flow — content/sets/git/github-flow.yaml 의 출력을 뽑는 이야기.
# main 은 늘 배포할 수 있는 상태. 기능 브랜치 → push → PR → 리뷰 반영 → squash 로 합치면 바로 배포.
# 운영 중 급한 수정도 같은 길로 간다.
# push · gh 는 연습용 GitHub 저장소에서 실제로 실행한다 (scripts/git-story-sandbox.sh). 돌릴 때마다 PR 이 둘 생긴다.
# 받아 오기는 GitHub 와 똑같이 맞춘 연습용 서버 저장소에서 한다(sandbox_split · sandbox_sync) — GitHub 에서 받으면 remote: 숫자가 실행마다 달라진다.
# 실행할 때마다 달라지는 PR 번호 · GitHub 가 만든 squash 커밋 해시는 rename 으로 고정한다.

quiet 'git config --global user.name "Kim Dev"'
quiet 'git config --global user.email "dev@example.com"'
quiet 'git config --global init.defaultBranch main'
quiet 'git config --global push.autoSetupRemote true'
source "$here/git-story-sandbox.sh"
sandbox_connect
sandbox_empty
sandbox_split
# GitHub 가 만든 squash 커밋은 서명 · 시각이 실행마다 달라 받아 오는 크기가 조금씩 다르다 — 고정한다
rename_re 'Unpacking objects: 100% \((\d+)/\1\), [0-9.]+ KiB' 'Unpacking objects: 100% (\1/\1), 1.04 KiB'

# 운영 중인 서비스 (치지 않음)
quiet 'git init -q && printf "# DevKeys\n" > README.md && printf "<form id=\"login\">\n  <button>Log in</button>\n</form>\n" > login.html && git add -A && git commit -q -m "feat: add login page" && git remote add origin https://github.com/kim/devkeys.git && git push -q -u origin main'
sandbox_default_main

run 'git switch -c feature/search'
quiet 'printf "<input id=\"q\">\n" > search.html && git add -A && git commit -q -m "feat(search): add search box"'
run 'git push'
run 'gh pr create --fill'
pr=$(gh pr view --json number -q .number)
rename_re "(pull/|#)$pr\\b" '\g<1>12'
rename_re "\"number\": $pr\\b" '"number": 12'
rename_re "merge $pr\\b" 'merge 12'
run 'gh pr view --json number,title,state'
quiet 'printf "<label for=\"q\">Search</label>\n<input id=\"q\">\n" > search.html'
run 'git commit -am "fix(search): add label"'
run 'git push'
run 'gh pr view --json commits --jq ".commits[].messageHeadline"'
run 'git switch main'
run "gh pr merge $pr --squash --delete-branch"
sandbox_sync
run 'git pull'
rename "$(git rev-parse --short HEAD)" 'a3f9c21'
run 'git log --oneline -2'

# 운영에서 로그인 버튼 문구가 틀렸다 — 급한 수정도 같은 길로
run 'git switch -c fix/login-label'
quiet 'sed -i "s/Log in/Sign in/" login.html && git commit -q -am "fix(login): say sign in"'
# 이 커밋의 부모는 GitHub 가 만든 squash 커밋이라 해시 · 크기도 실행마다 달라진다 — 고정한다
rename "$(git rev-parse --short HEAD)" 'c4d81e2'
rename_re "Writing objects: 100% \\(3/3\\), \\d+ bytes( \\| 1\\.00 MiB/s, done\\.\\nTotal 3 \\(delta 0\\), reused 0 \\(delta 0\\), pack-reused 0 \\(from 0\\)\\nremote:\\nremote: Create a pull request for 'fix/login-label')" 'Writing objects: 100% (3/3), 363 bytes\1'
run 'git push'
run 'gh pr create --fill'
pr2=$(gh pr view --json number -q .number)
rename_re "(pull/|#)$pr2\\b" '\g<1>13'
rename_re "\"number\": $pr2\\b" '"number": 13'
rename_re "merge $pr2\\b" 'merge 13'
run 'git switch main'
run "gh pr merge $pr2 --squash --delete-branch"
sandbox_sync
run 'git pull'
rename "$(git rev-parse --short HEAD)" 'b7e4d10'
run 'git log --oneline -3'
run 'gh pr list --state merged --limit 2 --json number,title'
run 'git log --reflog --format="%h %s"'
