# 각 이야기는 같은 초기 상태에서 시작한다. 사용자에게 입력시키지 않는 준비 코드.
mkdir -p project/src project/logs project/config
printf 'console.log("ready");\n' > project/src/app.js
printf 'PORT=3000\n' > project/config/app.env
printf 'INFO server ready\n' > project/logs/app.log
printf 'build/\n' > project/.gitignore
