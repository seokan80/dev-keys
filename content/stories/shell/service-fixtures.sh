# 세트 3~8의 공통 초기 상태. 앞 세트의 실행 결과를 이어받지 않는다.
umask 022
source "$(dirname "${BASH_SOURCE[0]}")/fixtures.sh"
mkdir -p project/notes project/cache/assets project/tmp
cat > project/README.md <<'DATA'
DevKeys service

Start the API with node src/app.js.
Use APP_ENV=staging during review.

The health endpoint is /health.
Logs are stored in logs/app.log.
Check ERROR lines before release.

Keep config/app.env out of public reports.
Read the worker log for background jobs.
Release only after the checks pass.
DATA
cat > project/logs/app.log <<'DATA'
INFO boot
INFO GET /health 200
WARN queue delayed
ERROR payment timeout
INFO retry payment
ERROR database offline
INFO GET /orders 200
INFO shutdown
DATA
cat > project/logs/worker.log <<'DATA'
INFO worker ready
WARN job slow
ERROR job failed
DATA
printf 'APP_ENV=staging\nPORT=3000\nLOG_LEVEL=info\n' > project/config/app.env
printf 'console.log("worker ready");\n' > project/src/worker.js
printf 'release candidate\ncheck logs first\n' > 'project/notes/release notes.txt'
printf 'cached asset\n' > project/cache/assets/bundle.js
printf 'session cache\n' > project/tmp/session.tmp
printf 'old cache\n' > project/tmp/old.tmp
touch project/tmp/empty.tmp
chmod 600 project/config/app.env
