import { describe, expect, it } from 'vitest';
import { hintOf, judge, sameCommand } from '@core/challenge';

describe('sameCommand — 글자 그대로 비교 (공백 · 따옴표 차이는 무시)', () => {
  it('공백 개수와 앞뒤 공백은 따지지 않는다', () => {
    expect(sameCommand('  git   switch  -c hotfix ', 'git switch -c hotfix')).toBe(true);
  });

  it('따옴표 종류가 달라도 같은 값이면 같다', () => {
    expect(sameCommand("git commit -m 'docs: add README'", 'git commit -m "docs: add README"')).toBe(true);
  });

  it('앞의 git 은 빼도 된다 (정답이 git 으로 시작할 때만)', () => {
    expect(sameCommand('switch -c hotfix', 'git switch -c hotfix')).toBe(true);
    expect(sameCommand('.toList()', '.toList()')).toBe(true);
    expect(sameCommand('git .toList()', '.toList()')).toBe(false);
  });

  it('옵션 · 값이 다르면 다르다', () => {
    expect(sameCommand('git switch hotfix', 'git switch -c hotfix')).toBe(false);
    expect(sameCommand('git commit -m "docs"', 'git commit -m "Docs"')).toBe(false);
  });

  it('따옴표가 닫히지 않으면 글자 그대로 비교한다', () => {
    expect(sameCommand('git commit -m "oops', 'git commit -m "oops"')).toBe(false);
    expect(sameCommand('git commit -m "oops', 'git  commit -m "oops')).toBe(true);
  });
});

describe('judge', () => {
  it('Shell은 따옴표·이스케이프·연산자의 뜻을 보존해 명시한 답만 인정한다', () => {
    const question = { answers: ['printf "%s\\n" "$HOME"'], match: 'literal' as const };
    expect(judge(question, '  printf "%s\\n" "$HOME"  ').correct).toBe(true);
    expect(judge(question, "printf '%s\\n' '$HOME'").correct).toBe(false);
    expect(judge({ answers: ['echo a > out'], match: 'literal' }, 'echo a \\> out').correct).toBe(false);
    expect(sameCommand('ls -1', 'ls  -1', 'literal')).toBe(false);
  });

  const create = { answers: ['git switch -c hotfix', 'git checkout -b hotfix'] };

  it('정답 목록 중 하나와 같으면 정답 (글자 비교)', () => {
    expect(judge(create, 'git checkout -b hotfix')).toEqual({ correct: true, via: 'text' });
    expect(judge(create, 'git switch hotfix')).toEqual({ correct: false, via: null });
  });

  it('정답 목록에 없어도 context 가 있으면 엔진으로 실행해 결과가 같으면 정답 (동의어)', () => {
    const q = { answers: ['git switch -c hotfix'], context: { setup: [] } };
    expect(judge(q, 'git checkout -b hotfix')).toEqual({ correct: true, via: 'engine' });
    // 만들기만 하고 이동하지 않으면 HEAD 가 다르다
    expect(judge(q, 'git branch hotfix')).toEqual({ correct: false, via: null });
  });

  it('reset 은 결과 트리가 같아도 모드가 다르면 오답 (--soft 는 --hard 의 정답이 아니다)', () => {
    const hard = { answers: ['git reset --hard HEAD~1'], context: { setup: ['git commit', 'git commit'] } };
    expect(judge(hard, 'git reset --hard HEAD^')).toEqual({ correct: true, via: 'engine' });
    expect(judge(hard, 'git reset --hard HEAD~')).toEqual({ correct: true, via: 'engine' });
    expect(judge(hard, 'git reset --soft HEAD~1').correct).toBe(false);
    expect(judge(hard, 'git reset HEAD~1').correct).toBe(false);
  });

  it('커밋 메시지가 다르면 오답', () => {
    const q = { answers: ['git commit -m "fix: typo"'], context: { setup: [] } };
    expect(judge(q, 'git commit --message "fix: typo"')).toEqual({ correct: true, via: 'engine' });
    expect(judge(q, 'git commit -m "fix typo"').correct).toBe(false);
  });

  it('머지: fast-forward 와 --no-ff 는 결과가 달라 서로 정답이 아니다', () => {
    const q = {
      answers: ['git merge --no-ff feature'],
      context: { setup: ['git switch -c feature', 'git commit', 'git switch main'] },
    };
    expect(judge(q, 'git merge feature').correct).toBe(false);
  });

  it('엔진이 모르는 명령 · 엔진에서 실패하는 명령 · 빈 입력은 오답', () => {
    const q = { answers: ['git switch -c hotfix'], context: { setup: [] } };
    expect(judge(q, 'git stash')).toEqual({ correct: false, via: null });
    expect(judge(q, 'git switch nope')).toEqual({ correct: false, via: null });
    expect(judge(q, '   ')).toEqual({ correct: false, via: null });
  });

  it('context 가 없으면 엔진으로 비교하지 않는다', () => {
    expect(judge({ answers: ['git switch -c hotfix'] }, 'git checkout -b hotfix').correct).toBe(false);
  });

  it('context 준비 명령이 실패하면 엔진 비교를 하지 않는다 (콘텐츠 검증이 먼저 막는다)', () => {
    const q = { answers: ['git switch -c hotfix'], context: { setup: ['git switch nope'] } };
    expect(judge(q, 'git checkout -b hotfix').correct).toBe(false);
  });
});

describe('hintOf — 첫 단어 힌트', () => {
  it('Git 은 모두 git 으로 시작하니 그 다음 단어(하위 명령)까지 보여 준다', () => {
    expect(hintOf('git switch -c hotfix')).toBe('git switch');
  });

  it('첫 단어가 곧 정답 전체면 첫 글자만', () => {
    expect(hintOf('git init')).toBe('git i');
    expect(hintOf('.toList()')).toBe('.');
  });

  it('git 이 아니면 첫 단어', () => {
    expect(hintOf('List.of(1, 2)')).toBe('List.of(1,');
  });
});
