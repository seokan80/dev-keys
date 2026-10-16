#!/usr/bin/env python3
"""가상 터미널에서 명령을 돌리며, 대화형 질문이 뜨면(출력이 잠시 멈추면) 답을 하나씩 넣는다. git-story.sh 가 쓴다.

    python3 scripts/pty-run.py '<명령>' <답> [<답> ...]

답을 미리 다 넣으면 터미널이 답을 출력보다 먼저 찍어 순서가 뒤섞인다. 질문을 기다릴 때 넣어야
실제 터미널처럼 "질문? y" 로 답이 질문 바로 뒤에 찍힌다.
"""

import os
import pty
import select
import signal
import sys

IDLE = 0.4  # 출력이 이만큼 멈추면 질문을 기다리는 것으로 본다 (초)
GIVE_UP = 15.0  # 넣을 답이 없는데 이만큼 멈춰 있으면 끝낸다

command, answers = sys.argv[1], list(sys.argv[2:])
pid, fd = pty.fork()
if pid == 0:
    os.execvp("bash", ["bash", "-c", command])

quiet_for = 0.0
while True:
    ready, _, _ = select.select([fd], [], [], IDLE)
    if ready:
        try:
            data = os.read(fd, 4096)
        except OSError:  # 명령이 끝나 터미널이 닫혔다
            break
        if not data:
            break
        sys.stdout.buffer.write(data)
        sys.stdout.flush()
        quiet_for = 0.0
        continue
    if answers:
        os.write(fd, (answers.pop(0) + "\n").encode())
        quiet_for = 0.0
        continue
    quiet_for += IDLE
    if quiet_for >= GIVE_UP:
        os.kill(pid, signal.SIGTERM)
        break

os.waitpid(pid, 0)
