# 큰 저장소 빠르게 — content/sets/git/large-repo.yaml 의 출력을 뽑는 이야기.
# 큰 데모 파일(assets/demo.bin)을 여러 번 바꿔 기록이 무거워진 저장소를, 필요한 만큼만 받아 쓴다:
# partial clone(파일 내용은 필요할 때) · shallow clone(최근 커밋만) · sparse-checkout(필요한 폴더만) · maintenance.
# 원격은 연습용 서버 저장소(~/server/devkeys.git)이고, https://github.com/kim/ 주소가 그쪽을 가리키게 했다(insteadOf).

quiet 'git config --global user.name "Kim Dev"'
quiet 'git config --global user.email "dev@example.com"'
quiet 'git config --global init.defaultBranch main'
quiet 'git init -q --bare ~/server/devkeys.git && git -C ~/server/devkeys.git config uploadpack.allowFilter true && git -C ~/server/devkeys.git config uploadpack.allowAnySHA1InWant true'
quiet 'git config --global url.file://$HOME/server/.insteadOf https://github.com/kim/'
# 기록 만들기: 데모 파일을 다섯 번 바꿨다 (치지 않음)
quiet 'mkdir -p ~/work && cd ~/work && git init -q && mkdir -p src docs assets && printf "# DevKeys\n" > README.md && printf "guide\n" > docs/guide.md && for i in 1 2 3 4 5; do seq $i 7 400000 > assets/demo.bin; printf "export const v = $i\n" > src/app.js; git add -A; GIT_AUTHOR_DATE="2026-10-1${i}T10:00:00+09:00" GIT_COMMITTER_DATE="2026-10-1${i}T10:00:00+09:00" git commit -q -m "feat: demo v$i"; done && git remote add origin ~/server/devkeys.git && git push -q origin main'

# 홈 폴더(~)에서 받는다
cd ~
run 'git clone https://github.com/kim/devkeys.git devkeys-full'
run 'git -C devkeys-full count-objects -vH | grep size-pack'
run 'git clone --filter=blob:none https://github.com/kim/devkeys.git'
run 'git -C devkeys count-objects -vH | grep size-pack'
run 'git clone --depth 1 https://github.com/kim/devkeys.git devkeys-shallow'
run 'git -C devkeys-shallow log --oneline'
run 'cd devkeys'
cd devkeys
run 'git log --oneline -3'
run 'git sparse-checkout set src docs'
run 'ls'
run 'git sparse-checkout list'
run 'git maintenance run --task=commit-graph --task=incremental-repack'
run 'git maintenance register'
run 'git config get --global maintenance.repo'
