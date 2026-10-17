# 이야기(content/stories/git/*.sh)에서 source 한다 — 연습용 GitHub 저장소 seokan80/devkeys-sandbox(비공개)를
# 이야기 속 https://github.com/kim/devkeys 로 쓴다. 출력의 저장소 이름은 이야기 속 이름으로 바꾼다.
#
#   source "$here/git-story-sandbox.sh"
#   sandbox_connect       — gh 인증 · 주소 연결(insteadOf). git config --global 을 쓰니 user.name 등을 정한 뒤 부른다
#   sandbox_empty         — 저장소를 빈 상태로: 릴리스 · 태그를 지우고, 자리 브랜치 base 를 만들어 기본 브랜치로 옮기고 나머지 브랜치를 지운다.
#                           GitHub 는 기본 브랜치를 지울 수 없어서, "빈 저장소에 처음 올리기"를 하려면 이렇게 비켜 둔다
#   sandbox_default_main  — main 을 올린 뒤 기본 브랜치를 main 으로 되돌리고 base 를 지운다
#                           (clone · fetch 출력에 base 가 섞이지 않고, 다른 이야기도 main 을 쓴다)

sandbox_connect() {
  export GH_CONFIG_DIR=/home/seokan/.config/gh GH_REPO=seokan80/devkeys-sandbox GH_PROMPT_DISABLED=1 GH_NO_UPDATE_NOTIFIER=1
  rename 'seokan80/devkeys-sandbox' 'kim/devkeys'
  quiet 'git config --global credential.https://github.com.helper "!gh auth git-credential"'
  quiet 'git config --global url.https://github.com/seokan80/devkeys-sandbox.insteadOf https://github.com/kim/devkeys'
}

sandbox_empty() {
  local tag
  for tag in $(gh release list --json tagName -q '.[].tagName'); do gh release delete "$tag" --yes >/dev/null; done
  (
    cd "$(mktemp -d -p "$root")" && git init -q && git commit -q --allow-empty -m "sandbox base" &&
      git push -q -f https://github.com/kim/devkeys.git HEAD:refs/heads/base >/dev/null 2>&1
  )
  gh api -X PATCH "repos/$GH_REPO" -f default_branch=base >/dev/null
  local refs
  refs=$(git ls-remote --heads --tags https://github.com/kim/devkeys.git | awk '$2 != "refs/heads/base" && $2 !~ /\^\{\}$/ { print ":" $2 }')
  # shellcheck disable=SC2086
  if [ -n "$refs" ]; then (cd "$(mktemp -d -p "$root")" && git init -q && git push -q https://github.com/kim/devkeys.git $refs >/dev/null 2>&1); fi
}

sandbox_default_main() {
  gh api -X PATCH "repos/$GH_REPO" -f default_branch=main >/dev/null
  (cd "$(mktemp -d -p "$root")" && git init -q && git push -q https://github.com/kim/devkeys.git :refs/heads/base >/dev/null 2>&1)
}

# 받아 오기(fetch · pull)는 연습용 서버 저장소에서, 올리기(push)는 GitHub 로 — GitHub 에서 받으면 remote: 숫자가 실행마다 달라진다.
#   sandbox_split  — 서버 저장소 ~/server/devkeys.git 를 만들고 주소를 나눈다 (sandbox_connect 뒤에 부른다)
#   sandbox_sync   — GitHub 의 브랜치를 서버 저장소에 그대로 맞춘다 (받아 오기 전에 부른다)
sandbox_split() {
  git init -q --bare "$HOME/server/devkeys.git"
  git config --global --unset url.https://github.com/seokan80/devkeys-sandbox.insteadOf
  git config --global url.file://"$HOME"/server/.insteadOf https://github.com/kim/
  git config --global url.https://github.com/seokan80/devkeys-sandbox.pushInsteadOf https://github.com/kim/devkeys
  rename 'file:///home/kim/server/' 'https://github.com/kim/'
}

sandbox_sync() {
  git -C "$HOME/server/devkeys.git" fetch -q --prune https://github.com/seokan80/devkeys-sandbox.git '+refs/heads/*:refs/heads/*'
}
