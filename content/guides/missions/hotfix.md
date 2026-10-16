## 운영 수정은 main 에서 갈라 낸다

hotfix 는 **운영(main)에서** 갈라 낸다. feature 에서 갈라 내면 아직 덜 된 로그인 기능까지 운영에 섞여 들어간다.

```
git switch -c hotfix      # main 에서 hotfix 를 만들며 이동
git commit -m "fix typo"  # 수정 커밋
git switch main
git merge hotfix          # main 이 뒤처져 있을 뿐이라 fast-forward
```

main 이 hotfix 를 만든 뒤로 움직이지 않았으니, 합칠 때 머지 커밋 없이 main 이 hotfix 의 커밋까지 앞으로 간다(fast-forward).

## 같은 결과를 내는 다른 풀이

- `git checkout -b hotfix` — `switch -c` 의 옛 방식
- `git branch hotfix` 다음 `git switch hotfix` — 만들기와 이동을 나눠서

이 미션은 **결과 트리**로 채점한다. 어떤 명령을 썼든 브랜치 위치와 HEAD 가 목표와 같으면 성공이다.

## 실무에서는

수정이 끝나면 feature 에도 이 수정이 필요할 수 있다. 다음 미션의 rebase 로 feature 를 최신 main 위로 옮기면 함께 들어간다.
