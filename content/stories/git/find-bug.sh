# AI가 만든 버그 찾기 — content/sets/git/find-bug.yaml 의 출력을 뽑는 이야기.
# 에이전트가 장바구니 합계 기능을 여러 커밋으로 다듬었는데, 어느새 테스트가 깨졌다.
# 어느 커밋에서 깨졌는지 git bisect 로 반씩 좁혀 찾고(손으로, 다음엔 bisect run 으로 자동), 그 커밋을 revert 한다.

quiet 'git config --global user.name "Kim Dev"'
quiet 'git config --global user.email "dev@example.com"'
quiet 'git config --global init.defaultBranch main'
quiet 'git init'

at() {
  git add -A
  GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1" git commit -q -m "$2"
}
quiet 'printf "# DevKeys\n" > README.md && at "2026-10-10T10:00:00+09:00" "docs: add README"'
quiet 'printf "# total PRICE QTY\necho \$((\$1 * \$2))\n" > total.sh && printf "[ \"\$(sh total.sh 300 2)\" = 600 ] && echo ok || { echo \"FAIL: total 300 x 2 is not 600\"; exit 1; }\n" > test.sh && at "2026-10-12T10:00:00+09:00" "feat(cart): add total"'
quiet 'printf "<ul id=\"cart\"></ul>\n" > cart.html && at "2026-10-13T10:00:00+09:00" "feat(cart): add cart list"'
quiet 'printf "# total PRICE QTY [DISCOUNT]\necho \$((\$1 * \$2 - \${3:-0}))\n" > total.sh && at "2026-10-14T10:00:00+09:00" "feat(cart): support discount"'
quiet 'printf "# total PRICE QTY [DISCOUNT]\necho \$((\$1 * \$2 - \${3:-1}))\n" > total.sh && at "2026-10-15T10:00:00+09:00" "refactor(cart): default discount"'
quiet 'printf "button { color: teal }\n" > cart.css && at "2026-10-15T15:00:00+09:00" "style(cart): color buttons"'
quiet 'printf "<ul id=\"cart\" aria-live=\"polite\"></ul>\n" > cart.html && at "2026-10-16T10:00:00+09:00" "feat(cart): announce changes"'

run 'git log --oneline'
run 'sh test.sh'
run 'git bisect start'
run 'git bisect bad'
run 'git bisect good ced3b92'
run 'git bisect view --oneline'
run 'git status'
run 'sh test.sh'
run 'git bisect good'
run 'sh test.sh'
run 'git bisect bad'
run 'sh test.sh'
run 'git bisect bad'
run 'git bisect log'
run 'git bisect reset'
run 'git show 4c0ddb1'
run 'git bisect start HEAD ced3b92'
run 'git bisect run sh test.sh'
run 'git bisect reset'
run 'git revert --no-edit 4c0ddb1'
run 'sh test.sh'
run 'git blame -L 2,2 total.sh'
run 'git log --oneline -3'
