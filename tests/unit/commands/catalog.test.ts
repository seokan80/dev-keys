import { describe, expect, it } from 'vitest';
import { buildCatalog, shapeOf } from '../../../src/lib/commands/catalog';

describe('shapeOf: 명령 줄을 명령 모양으로', () => {
  it('값(브랜치 · 메시지 · 주소)은 빼고 도구 · 하위 명령 · 옵션만 — 옵션 순서는 묶을 때 상관없다', () => {
    expect(shapeOf('git switch -c feature/search main')?.key).toBe('git switch -c');
    expect(shapeOf('git commit -m "feat: add search box"')?.key).toBe('git commit -m');
    expect(shapeOf('git log --oneline --graph --all')?.key).toBe(shapeOf('git log --all --oneline --graph')?.key);
    expect(shapeOf('git log --oneline main..origin/main')?.key).toBe('git log --oneline');
    expect(shapeOf('git log --oneline -- README.md')?.key).toBe('git log --oneline');
  });

  it('숫자 옵션 · 값이 붙은 옵션은 한 모양으로', () => {
    expect(shapeOf('git log --oneline -5')?.key).toBe(shapeOf('git log --oneline -3')?.key);
    expect(shapeOf('git commit --fixup=HEAD~1')?.key).toBe('git commit --fixup=');
    expect(shapeOf('git log --format="%h %s" -3')?.key).toBe(shapeOf('git log -2 --format="%an"')?.key);
  });

  it('동작 단어가 있는 하위 명령(stash pop · remote add · gh pr merge)은 동작까지', () => {
    expect(shapeOf('git stash pop')?.key).toBe('git stash pop');
    expect(shapeOf('git remote add upstream https://github.com/devkeys-org/devkeys.git')?.key).toBe('git remote add');
    expect(shapeOf('gh pr merge 12 --squash --delete-branch')?.key).toBe('gh pr merge --delete-branch --squash');
  });

  it('config 는 설정 이름별로 — 옛 모양(--global 이름 값)과 새 모양(set --global 이름 값)이 한데', () => {
    expect(shapeOf('git config --global pull.rebase true')?.key).toBe('git config pull.rebase');
    expect(shapeOf('git config set --global pull.rebase true')?.key).toBe('git config pull.rebase');
    expect(shapeOf('git config list --global')?.key).toBe('git config list --global');
  });

  it('git -C <폴더> 는 건너뛰고, switch - 의 - 는 남긴다. git · gh 가 아닌 줄은 없다', () => {
    expect(shapeOf('git -C ~/work/api config get user.email')?.key).toBe('git config user.email');
    expect(shapeOf('git switch -')?.key).toBe('git switch -');
    expect(shapeOf('cd devkeys')).toBeNull();
    expect(shapeOf('sh test.sh')).toBeNull();
  });

  it('주소 조각(slug)은 겹치지 않게 — 대소문자 옵션도 구분', () => {
    expect(shapeOf('git branch -D hotfix/typo')?.slug).toBe('branch-D');
    expect(shapeOf('git branch -d feature/login')?.slug).toBe('branch-d');
    expect(shapeOf('gh pr create --fill')?.slug).toBe('gh-pr-create-fill');
    expect(shapeOf('git switch -')?.slug).toBe('switch-dash');
    expect(shapeOf('git config set --global pull.rebase true')?.slug).toBe('config-pull-rebase');
  });
});

const set = (id: string, lines: [string, string?][], recalls: [string, string][] = []) => ({
  id,
  category: 'git',
  title: `${id} 세트`,
  href: `/git/${id}`,
  lines: lines.map(([text, note], i) => ({
    text,
    comments: note ? [note] : [],
    output: i === 0 ? 'out' : null,
    prompt: null,
    itemId: `i${i}`,
  })),
  recalls: recalls.map(([prompt, answer], i) => ({
    itemId: `r${i}`,
    prompt: [{ text: prompt, value: false }],
    answers: [answer],
  })),
});

describe('buildCatalog', () => {
  const catalog = buildCatalog([
    set(
      'a',
      [
        ['git commit --amend -m "fix typo"', '(오타를 찾았다) 마지막 커밋의 메시지를 고친다'],
        ['git commit -m "feat: x"'],
        ['cd devkeys'],
      ],
      [['마지막 커밋의 메시지를 <message> 로 고친다', 'git commit --amend -m "<message>"']],
    ),
    set('b', [['git commit -m "docs: y"', '커밋한다']], [['처음 보는 상황', 'git restore --staged <file>']]),
  ]);
  const by = (key: string) => catalog.find((c) => c.key === key)!;

  it('같은 모양의 줄을 예시로 묶고, 세트 · 해설 · 출력을 단다. git · gh 가 아닌 줄은 빠진다', () => {
    expect(catalog.map((c) => c.key).sort()).toEqual([
      'git commit --amend -m',
      'git commit -m',
      'git restore --staged',
    ]);
    expect(by('git commit -m').examples.map((e) => e.setId)).toEqual(['a', 'b']);
    expect(by('git commit --amend -m').examples[0]).toMatchObject({
      setTitle: 'a 세트',
      href: '/git/a',
      output: 'out',
    });
  });

  it('해설 앞의 이야기 괄호는 떼고, 도전 문제 설명을 상황으로 붙인다', () => {
    const amend = by('git commit --amend -m');
    expect(amend.examples[0]!.note).toBe('마지막 커밋의 메시지를 고친다');
    expect(amend.situations).toEqual(['마지막 커밋의 메시지를 <message> 로 고친다']);
  });

  it('예시 줄이 없는 모양도 도전 문제가 있으면 항목이 된다', () => {
    expect(by('git restore --staged')).toMatchObject({ examples: [], situations: ['처음 보는 상황'] });
    expect(by('git restore --staged').sets.map((s) => s.id)).toEqual(['b']);
    expect(by('git commit -m').sets.map((s) => s.id)).toEqual(['a', 'b']);
  });
});
