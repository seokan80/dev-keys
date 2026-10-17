# 기록에 남기기 — content/sets/git/commit-trailers.yaml 의 출력을 뽑는 이야기.
# AI 에이전트와 함께 만든 커밋에는 Conventional Commits 제목과 Co-authored-by 꼬리말을 남기고,
# 나중에 그 기록으로 에이전트와 함께한 커밋을 찾고 센다. 끝으로 커밋 서명(SSH)을 설정해 둔다.

quiet 'git config --global user.name "Kim Dev"'
quiet 'git config --global user.email "dev@example.com"'
quiet 'git config --global init.defaultBranch main'
quiet 'git init'

at() {
  git add -A
  GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1" git commit -q -m "$2"
}
quiet 'printf "# DevKeys\n" > README.md && at "2026-10-10T10:00:00+09:00" "docs: add README"'
quiet 'printf "export const request = (url) => fetch(url)\n" > api.js && at "2026-10-15T11:30:00+09:00" "feat(api): add api client"'

run 'git log --oneline'
run 'git config set trailer.ai.key Co-authored-by'

quiet 'printf "<input id=\"q\">\n" > search.html && git add search.html'
run 'git commit -m "feat(search): add search box" --trailer "ai: Claude <noreply@anthropic.com>"'
run 'git log -1 --format=%B'

quiet 'printf "export const search = (q) => q && request(\"/search?q=\" + q)\n" > search.js && git add search.js'
run 'git commit -m "fix(search): ignore empty query" --trailer "ai: Claude <noreply@anthropic.com>"'

quiet 'printf "# DevKeys\n\nSearch with the box on top.\n" > README.md && git add README.md'
run 'git commit -m "docs: describe search"'

run 'git log --oneline --grep="Co-authored-by: Claude"'
run 'git log --oneline --grep="^feat"'
run 'git shortlog -sn --group=author --group=trailer:co-authored-by'

run 'git config set --global gpg.format ssh'
run 'git config set --global user.signingkey ~/.ssh/id_ed25519.pub'
run 'git config set --global commit.gpgSign true'
