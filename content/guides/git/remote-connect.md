## 원격과 짝(upstream)

| 말               | 뜻                                                                                      |
| ---------------- | --------------------------------------------------------------------------------------- |
| 원격 (`origin`)  | 다른 곳에 있는 같은 저장소의 이름과 주소. `clone` 하면 받은 곳이 `origin` 으로 등록된다 |
| 원격 브랜치      | `origin/main` — 마지막으로 받아 왔을 때 원격의 main 이 어디였는지 적어 둔 이름표        |
| 짝 (upstream)    | 내 브랜치가 따라가는 원격 브랜치. `git push` · `git pull` 을 이름 없이 칠 때 쓰인다     |
| `push -u` · `-u` | 올리면서 짝을 정한다 (`--set-upstream`)                                                 |

`git branch -vv` 가 브랜치마다 짝을 `[origin/main]` 처럼 보여 준다. 짝이 있으면 `git status` 도 "앞섰다 · 뒤처졌다"를 알려 준다 — 단, 마지막으로 받아 온 때 기준이다 (8번 세트).

## 처음 올리기까지

1. GitHub 에서 빈 저장소를 만든다 (README · .gitignore 를 만들지 않아야 바로 올릴 수 있다). `gh repo create` 로 터미널에서 만들 수도 있다
2. `git remote add origin <주소>`
3. `git push -u origin main`

이미 GitHub 에 있는 저장소라면 `git clone <주소> [폴더]` 한 번이면 된다. 원격 등록 · 짝 설정 · 기본 브랜치 꺼내기까지 해 준다.

## 인증 — 비밀번호로는 올라가지 않는다

GitHub 는 HTTPS 로 올릴 때 계정 비밀번호를 받지 않는다 (2021 년부터). 셋 중 하나를 쓴다.

| 방법                   | 하는 일                                                                        |
| ---------------------- | ------------------------------------------------------------------------------ |
| `gh auth login`        | GitHub CLI 로 로그인하면 git 의 자격 증명 도우미로도 등록된다 (가장 간단)      |
| Git Credential Manager | Windows · macOS 용 Git 에 들어 있다. 처음 push 할 때 브라우저로 로그인         |
| SSH 키                 | `ssh-keygen -t ed25519` → 공개 키를 GitHub 에 등록 → 주소를 `git@github.com:…` |

토큰(PAT)을 직접 만든다면 fine-grained 토큰으로 저장소와 권한을 좁힌다. 주소를 HTTPS ↔ SSH 로 바꿀 때는 `git remote set-url`.

## 최신 Git

- **2.37 `push.autoSetupRemote`** — 짝이 없는 브랜치를 `git push` 하면 같은 이름으로 짝을 만들며 올린다. 새 브랜치마다 `-u` 를 칠 필요가 없다
- **2.48** — `git fetch` 가 원격의 기본 브랜치를 가리키는 `origin/HEAD` 가 없으면 만들어 둔다 (`remote add` 로 연결한 저장소도)
- **2.46 `git config set`** — `git config --global 이름 값` 대신 `git config set --global 이름 값` 으로도 쓴다 (2번 세트)

## AI 에이전트와 쓸 때

- **맡기기 전에 `git remote -v`.** 에이전트가 무엇을 어디로 올릴지 먼저 본다. 에이전트가 원격 주소를 바꾸는(`remote set-url` · `remote add`) 일은 없어야 한다
- **에이전트는 새 브랜치에만 올린다.** `push.autoSetupRemote` 를 켜 두면 에이전트가 브랜치 이름만 정하면 된다. main 은 브랜치 보호로 막는다 (5부 "함께하는 팀")
- **토큰은 좁게.** 에이전트 환경에 넣는 토큰은 그 저장소 · 필요한 권한(contents 읽기 · 쓰기, pull requests)만

## 더 읽기

- [git remote](https://git-scm.com/docs/git-remote) · [git push](https://git-scm.com/docs/git-push) · [git clone](https://git-scm.com/docs/git-clone)
- [GitHub — 원격 저장소 인증](https://docs.github.com/ko/get-started/git-basics/about-remote-repositories)
