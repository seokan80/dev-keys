# AI 에이전트와 함께하는 팀 — content/sets/git/agent-team.yaml 의 출력을 뽑는 이야기.
# 팀 규칙(AGENTS.md · CODEOWNERS)이 있는 저장소에서, 에이전트가 이슈 42 를 맡아 브랜치를 올리고 draft PR 을 연다.
# 사람이 검토해 ready 로 바꾸고 squash 로 합친다. 같은 계정은 자기 PR 을 승인할 수 없다는 것도 본다.
#
# gh 명령은 연습용 GitHub 저장소(seokan80/devkeys-sandbox, 비공개)에서 실제로 실행한다. 이야기 속 주소
# https://github.com/kim/devkeys 가 그 저장소를 가리키게 하고(insteadOf), gh 는 GH_REPO 로 그 저장소만 쓴다.
# 실행할 때마다 달라지는 저장소 이름 · PR 번호 · GitHub 가 만든 커밋 해시는 rename 으로 이야기 속 값으로 바꾼다.

export GH_CONFIG_DIR=/home/seokan/.config/gh GH_REPO=seokan80/devkeys-sandbox GH_PROMPT_DISABLED=1 GH_NO_UPDATE_NOTIFIER=1
rename 'seokan80/devkeys-sandbox' 'kim/devkeys'

quiet 'git config --global user.name "Kim Dev"'
quiet 'git config --global user.email "dev@example.com"'
quiet 'git config --global init.defaultBranch main'
quiet 'git config --global credential.https://github.com.helper "!gh auth git-credential"'
quiet 'git config --global url.https://github.com/seokan80/devkeys-sandbox.insteadOf https://github.com/kim/devkeys'

# 연습용 저장소를 시작 상태로 되돌린다: 팀 규칙이 든 커밋 하나 (치지 않음)
cd ~
quiet 'rm -rf base && mkdir base && cd base && git init -q && mkdir -p .github \
  && printf "# DevKeys\n" > README.md \
  && printf "# Rules for AI agents\n- One task = one branch: agent/<issue>-<name>\n- Open pull requests as draft. A human marks them ready.\n- Conventional Commits, with a Co-authored-by trailer\n- Never push to main\n" > AGENTS.md \
  && printf "*        @kim\n/src/api @kim @lee\n" > .github/CODEOWNERS \
  && git add -A && GIT_AUTHOR_DATE="2026-10-10T10:00:00+09:00" GIT_COMMITTER_DATE="2026-10-10T10:00:00+09:00" git commit -q -m "docs: add team rules" \
  && git push -q --force https://github.com/kim/devkeys.git main'

run 'git clone https://github.com/kim/devkeys.git'
run 'cd devkeys'
cd devkeys
run 'cat AGENTS.md'
run 'cat .github/CODEOWNERS'
run 'git switch -c agent/42-search'

# 에이전트가 이슈 42 를 맡아 커밋했다 (치지 않음)
quiet 'mkdir -p src && printf "<input id=\"q\">\n" > src/search.html && git add -A && GIT_AUTHOR_DATE="2026-10-17T10:30:00+09:00" GIT_COMMITTER_DATE="2026-10-17T10:30:00+09:00" git commit -q -m "feat(search): add search box" --trailer "Co-authored-by: Claude <noreply@anthropic.com>"'

run 'git log --oneline -1'
run 'git push -u origin agent/42-search'
run 'gh pr create --draft --fill'
pr=$(gh pr view --json number -q .number)
rename_re "(pull/|#)$pr\\b" '\g<1>12'
rename_re "\"number\": $pr\\b" '"number": 12'
run 'gh pr view --json title,isDraft,headRefName'
run 'gh pr diff --name-only'
run 'gh pr ready'
run 'gh pr review --approve'
run 'gh pr merge --squash --delete-branch'
rename "$(git rev-parse --short HEAD)" '3e7d1c9'
# GitHub 가 만든 squash 커밋의 크기도 실행마다 조금씩 달라서 고정한다
rename_re 'Unpacking objects: 100% \((\d+)/\1\), [0-9.]+ KiB' 'Unpacking objects: 100% (\1/\1), 1.03 KiB'
run 'git log --oneline -2'
run 'git branch -a'
run 'gh pr list --state merged --limit 1 --json number,title'
