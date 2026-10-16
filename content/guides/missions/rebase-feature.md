## rebase 는 커밋을 복사해 다시 쌓는다

`git rebase main` 은 지금 브랜치(feature)에만 있는 커밋을 main 끝에 **새 커밋으로 복사**해 다시 쌓고, feature 를 복사본 끝으로 옮긴다. 원래 커밋(C2, C3)은 어느 브랜치에서도 닿지 않게 되어 흐리게 남는다. 복사본에는 `C2'` 처럼 `'` 가 붙는다.

```
git switch feature
git rebase main     # feature 의 C2 C3 → main 끝의 C2' C3'
git switch main
git merge feature   # main 이 뒤처져 있을 뿐 → fast-forward, 머지 커밋 없음
```

## merge 와 무엇이 다른가

`git switch main` 다음 `git merge feature` 를 바로 하면 두 갈래를 합치는 **머지 커밋**이 생긴다. 기록이 갈라졌다 합쳐진 모양이 남는다. 이 미션의 목표는 한 줄 기록이라 merge 로는 성공하지 않는다.

## 같은 결과를 내는 다른 풀이

```
git switch feature
git reset --hard main    # feature 를 main 위치로
git cherry-pick C2 C3    # 커밋을 하나씩 복사
git switch main
git merge feature
```

rebase 는 이 과정을 한 번에 해 주는 명령이다.

## 주의

rebase 는 커밋 해시를 바꾼다. 다른 사람과 이미 공유(push)한 브랜치는 rebase 하지 않는다.
