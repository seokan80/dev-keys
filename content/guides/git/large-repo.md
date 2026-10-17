## 무엇을 덜 받나

| 방법            | 명령                                  | 받는 것                                      |
| --------------- | ------------------------------------- | -------------------------------------------- |
| 보통 clone      | `git clone <주소>`                    | 모든 커밋의 모든 파일 내용                   |
| partial clone   | `git clone --filter=blob:none <주소>` | 커밋 · 폴더 구조는 다, 파일 내용은 필요할 때 |
| shallow clone   | `git clone --depth 1 <주소>`          | 최근 커밋만                                  |
| sparse-checkout | `git sparse-checkout set <폴더…>`     | (받은 것 중) 작업 폴더에 꺼내 둘 폴더만      |

partial · shallow 는 **무엇을 내려받을지**, sparse-checkout 은 **무엇을 작업 폴더에 꺼내 둘지** 를 정한다. 함께 쓸 수 있다.

## partial 이냐 shallow 냐

- **partial clone** — 기록이 다 있어 `log` · `blame` · `bisect` 가 된다. 예전 파일 내용이 필요하면 그때 받아 오므로 원격에 접속할 수 있어야 한다. 사람이 오래 쓰는 저장소에
- **shallow clone** — 기록이 없어 `blame` · `bisect` 가 제대로 되지 않는다. 한 번 빌드하고 버리는 CI 에. GitHub Actions 의 `actions/checkout` 도 기본은 최근 커밋 하나만 받는다. 나중에 기록이 필요하면 `git fetch --unshallow`
- 큰 파일만 빼고 싶으면 `--filter=blob:limit=1m` (1MB 넘는 파일만 나중에)

## sparse-checkout

- `set src docs` 로 꺼낼 폴더를 정하고, `add <폴더>` 로 더하고, `list` 로 보고, `disable` 로 다 꺼낸다
- 기본(cone 방식)은 폴더 단위로 고르고, 맨 위 폴더의 파일은 늘 꺼내 둔다
- 처음부터 맨 위 파일만 꺼내고 시작하려면 `git clone --sparse <주소>`

## maintenance — 저장소 정리를 알아서

| 명령                           | 하는 일                                                                            |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| `git maintenance run --task=…` | 정리 작업을 지금 돌린다 (`commit-graph`, `incremental-repack`, `prefetch`, `gc` …) |
| `git maintenance register`     | 이 저장소를 정리 대상으로 등록한다 (전역 설정 `maintenance.repo`)                  |
| `git maintenance start`        | 등록 + 시간마다 돌도록 예약 (cron · systemd · launchd)                             |
| `git maintenance stop`         | 예약을 끈다                                                                        |

`commit-graph` 는 `log --graph` · `merge-base` 를 빠르게, `prefetch` 는 원격의 새 커밋을 미리 받아 `fetch` 를 빠르게 한다.

## 최신 Git

- **2.38 `scalar`** — 큰 저장소 설정을 한 번에: `scalar clone <주소>` 는 partial clone · sparse-checkout · maintenance 예약을 모두 켜서 받는다
- **2.49 `git backfill`** — partial clone 에서 빠진 파일 내용을 묶어서 한꺼번에 받는다 (하나씩 받을 때보다 빠르다)
- **2.53 `git maintenance is-needed`** — 지금 정리가 필요한지 알려 준다. 스크립트에서 쓰기 좋다
- **2.55 Linux 내장 fsmonitor** — `git config set core.fsmonitor true` 로 파일 변경을 감시해 `git status` 가 작업 폴더 전체를 훑지 않는다 (macOS · Windows 는 전부터)

## AI 에이전트와 쓸 때

- **작업 범위를 좁힌다.** 에이전트는 저장소 전체를 읽고 찾으려 한다. 큰 저장소(모노레포)에서는 sparse-checkout 으로 맡길 폴더만 꺼내 두면 찾기가 빠르고 엉뚱한 곳을 덜 고친다
- **에이전트마다 clone 하지 말고 worktree.** worktree 는 객체를 함께 써서 디스크 · 네트워크를 아낀다. partial clone 위에 worktree 를 여러 개 여는 조합이 가볍다 (에이전트 작업 격리)
- **에이전트용 CI · 컨테이너가 shallow 면** `blame` · `bisect` 를 못 한다. 버그 찾기를 맡길 환경은 partial clone 으로
- `git maintenance start` 로 정리해 두면 `status` · `log` 가 빨라진다 — 에이전트가 이 명령을 수없이 부르니 차이가 쌓인다

## 더 읽기

- [git clone (--filter · --depth · --sparse)](https://git-scm.com/docs/git-clone) · [git sparse-checkout](https://git-scm.com/docs/git-sparse-checkout) · [git maintenance](https://git-scm.com/docs/git-maintenance) · [scalar](https://git-scm.com/docs/scalar)
