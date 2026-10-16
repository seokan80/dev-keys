# 설정과 .gitignore — content/sets/git/config-ignore.yaml 의 출력을 뽑는 이야기.
# 1편(변경 사항 기록하기)을 마친 ~/devkeys 에서 이어진다. 그 사이 API 키를 담은 .env 를 실수로 커밋했다.

# ── 1편까지 (치지 않음)
quiet 'git config --global user.name "Kim Dev"'
quiet 'git config --global user.email "dev@example.com"'
quiet 'git config --global init.defaultBranch main'
quiet 'git init'
quiet 'echo "# DevKeys" > README.md && git add README.md && git commit -m "docs: add README"'
quiet 'echo "API_KEY=sk-test-1234" > .env && echo "fetch(url)" > api.js && git add . && git commit -m "feat: add api client"'

# ── 설정 보기
run 'git config list --global'
run 'git config get user.email'
run 'git config list --show-origin'

# ── 회사 저장소에서는 회사 이메일
run 'git config set --global includeIf.gitdir:~/work/.path ~/.gitconfig-work'
run 'git config set --file ~/.gitconfig-work user.email kim@company.com'
run 'git init ~/work/api'
run 'git -C ~/work/api config get user.email'

# ── 권장 설정
run 'git config set --global push.autoSetupRemote true'
run 'git config set --global fetch.prune true'
run 'git config set --global merge.conflictStyle zdiff3'
run 'git config set --global rerere.enabled true'
run 'git config set --global diff.algorithm histogram'
run 'git config set --global branch.sort -committerdate'
run 'git config set --global alias.lg "log --oneline --graph --all"'
run 'git lg'

# ── .gitignore
run 'echo ".env" >> .gitignore'
run 'git status --short'
run 'git rm --cached .env'
run 'git status --short'
run 'git check-ignore -v .env'
run 'git add .gitignore'
run 'git commit -m "chore: stop tracking .env"'

# ── 모든 저장소에 쓰는 무시 목록
run 'mkdir -p ~/.config/git'
run 'echo ".DS_Store" >> ~/.config/git/ignore'
run 'git check-ignore -v .DS_Store'
