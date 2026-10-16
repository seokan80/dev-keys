## cherry-pick 은 커밋 하나를 복사한다

`git cherry-pick C3` 는 C3 이 만든 변경을 지금 브랜치(main) 위에 **새 커밋으로 복사**한다. 복사본은 `C3'` 이다. experiment 브랜치는 그대로 남는다.

```
git cherry-pick C3
```

## 같은 결과를 내는 다른 풀이

- `git cherry-pick experiment~1` — experiment 끝(C4)에서 한 칸 앞
- `git cherry-pick c3` — 이 연습에서 라벨은 대소문자를 가리지 않는다

## merge 와 무엇이 다른가

`git merge experiment` 를 하면 덜 된 실험(C4)까지 함께 들어온다. 필요한 커밋만 골라 가져올 때가 cherry-pick 의 자리다.

## 주의

나중에 experiment 를 main 에 합치거나 rebase 하면, 같은 변경이 두 번 들어간 것으로 보일 수 있다. git 은 rebase 때 이미 반영된 같은 변경을 알아보고 건너뛴다.
