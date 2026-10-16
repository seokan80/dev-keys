import { describe, expect, it } from 'vitest';
import { buildContent, type RawFile } from '../../../src/lib/content/check';

/** 약 3분 분량이 되게 같은 명령을 여러 번 넣는다 (예상 시간 경고를 피하려고) */
const filler = Array.from(
  { length: 18 },
  (_, i) => `  - id: f${i}\n    type: copy\n    text: git log --oneline --graph --all\n`,
).join('');

function setYaml(over: Record<string, string> = {}, items?: string) {
  const f = {
    id: 'git-basic-commit',
    category: 'git',
    order: '1',
    title: '변경 기록',
    description: '기초 명령',
    level: '1',
    ...over,
  };
  const head = Object.entries(f)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  return `${head}\nitems:\n${items ?? `  - id: status\n    type: copy\n    text: git status\n    note: 상태를 본다\n${filler}`}`;
}

const file = (path: string, text: string): RawFile => ({ path, text });
const GUIDES = ['content/guides/git/basic-commit.md'];
const errors = (r: ReturnType<typeof buildContent>) =>
  r.problems.filter((p) => p.level === 'error').map((p) => `${p.path}: ${p.message}`);

describe('정상 세트', () => {
  it('문제 줄·해설·주소를 만든다', () => {
    const r = buildContent([file('content/sets/git/basic-commit.yaml', setYaml())], GUIDES);
    expect(errors(r)).toEqual([]);
    const set = r.sets[0]!;
    expect(set).toMatchObject({ slug: 'basic-commit', href: '/git/basic-commit', id: 'git-basic-commit' });
    expect(set.lines[0]).toEqual({ text: 'git status', note: '상태를 본다', itemId: 'status' });
    expect(set.lines).toHaveLength(19);
  });

  it('코드 블록은 줄로 나누고, 줄별 해설은 at 으로 찾고, 문제 전체 설명보다 우선한다', () => {
    const items = [
      '  - id: stream',
      '    type: copy',
      '    note: 전체 설명',
      '    text: |',
      '      List<String> names = users.stream()',
      '          .map(User::name)',
      '          .toList();',
      '    notes:',
      '      - at: .toList();',
      '        note: 수정할 수 없는 List',
      '    hidden:',
      '      before: "class A { void f(java.util.List<User> users) {"',
      "      after: '} }'",
      filler,
    ].join('\n');
    const r = buildContent(
      [file('content/sets/java/stream.yaml', setYaml({ id: 'java-stream', category: 'java' }, items))],
      ['content/guides/java/stream.md'],
    );
    expect(errors(r)).toEqual([]);
    expect(r.sets[0]!.lines.slice(0, 3)).toEqual([
      { text: 'List<String> names = users.stream()', note: '전체 설명', itemId: 'stream' },
      { text: '    .map(User::name)', note: '전체 설명', itemId: 'stream' },
      { text: '    .toList();', note: '수정할 수 없는 List', itemId: 'stream' },
    ]);
  });
});

describe('형식 오류', () => {
  const one = (path: string, text: string, guides = GUIDES) => errors(buildContent([file(path, text)], guides));

  it('YAML 문법', () => {
    expect(one('content/sets/git/basic-commit.yaml', 'id: [oops')[0]).toMatch(/YAML/);
  });

  it('필수 칸 누락·모르는 칸', () => {
    expect(one('content/sets/git/basic-commit.yaml', setYaml().replace(/^title: .*\n/m, ''))[0]).toMatch(/title/);
    expect(one('content/sets/git/basic-commit.yaml', setYaml({ guide: 'git/x' }))[0]).toMatch(/guide/);
  });

  it('카테고리 폴더·id·슬러그 규칙', () => {
    expect(one('content/sets/java/basic-commit.yaml', setYaml())).toEqual(
      expect.arrayContaining([expect.stringMatching(/category/)]),
    );
    expect(one('content/sets/git/basic-commit.yaml', setYaml({ id: 'git-other' }))[0]).toMatch(/id/);
    expect(one('content/sets/git/challenge.yaml', setYaml({ id: 'git-challenge' }))[0]).toMatch(/예약/);
    expect(one('content/sets/git/Basic_Commit.yaml', setYaml({ id: 'git-Basic_Commit' }))[0]).toMatch(/슬러그/);
    expect(one('content/sets/rust/x.yaml', setYaml({ id: 'rust-x', category: 'git' }))[0]).toMatch(/카테고리/);
  });

  it('해설 파일이 없으면 오류', () => {
    expect(one('content/sets/git/basic-commit.yaml', setYaml(), [])[0]).toMatch(/해설/);
  });

  it('카테고리 안에서 order 가 겹치면 오류', () => {
    const r = buildContent(
      [
        file('content/sets/git/basic-commit.yaml', setYaml()),
        file('content/sets/git/branch.yaml', setYaml({ id: 'git-branch' })),
      ],
      [...GUIDES, 'content/guides/git/branch.md'],
    );
    expect(errors(r)).toEqual([expect.stringMatching(/order 1/)]);
  });

  it('문제 id 가 겹치면 오류', () => {
    const items = `  - id: a\n    type: copy\n    text: git status\n  - id: a\n    type: copy\n    text: git log\n${filler}`;
    expect(one('content/sets/git/basic-commit.yaml', setYaml({}, items))[0]).toMatch(/문제 id "a"/);
  });

  it('따라치기 문제가 하나도 없으면 오류', () => {
    const items = `  - id: r\n    type: recall\n    prompt: 상태 보기\n    answers: [git status]\n`;
    expect(one('content/sets/git/basic-commit.yaml', setYaml({}, items))).toEqual(
      expect.arrayContaining([expect.stringMatching(/따라치기 문제/)]),
    );
  });
});

describe('따라치기 글 규칙', () => {
  const withText = (text: string) =>
    errors(
      buildContent(
        [
          file(
            'content/sets/git/basic-commit.yaml',
            setYaml({}, `  - id: t\n    type: copy\n    text: ${JSON.stringify(text)}\n${filler}`),
          ),
        ],
        GUIDES,
      ),
    );

  it('ASCII 밖 글자(한글 주석 등)', () => {
    expect(withText('git commit -m "기능 추가"')[0]).toMatch(/1번째 줄.*ASCII/);
  });

  it('탭·줄 끝 공백·80자 넘는 줄·앞뒤 빈 줄', () => {
    expect(withText('a\n\tb')[0]).toMatch(/2번째 줄.*탭/);
    expect(withText('git status ')[0]).toMatch(/줄 끝 공백/);
    expect(withText('x'.repeat(81))[0]).toMatch(/80자/);
    expect(withText('\ngit status')[0]).toMatch(/빈 줄/);
  });

  it('YAML 블록(|)의 마지막 줄바꿈 하나는 괜찮다', () => {
    expect(withText('git status\n')).toEqual([]);
  });

  it('줄별 해설 at 은 정확히 한 줄에 맞아야 한다', () => {
    const items = (notes: string) =>
      `  - id: t\n    type: copy\n    text: "git add .\\ngit add -p"\n    notes:\n${notes}${filler}`;
    const run = (notes: string) =>
      errors(buildContent([file('content/sets/git/basic-commit.yaml', setYaml({}, items(notes)))], GUIDES));
    expect(run('      - at: commit\n        note: x\n')[0]).toMatch(/맞는 줄이 없다/);
    expect(run('      - at: git add\n        note: x\n')[0]).toMatch(/2줄에 맞는다/);
    expect(run('      - at: add .\n        note: x\n      - at: " ."\n        note: y\n')[0]).toMatch(/같은 줄/);
  });
});

describe('뜻 보고 치기(recall) 규칙', () => {
  const recall = (body: string) =>
    errors(
      buildContent(
        [file('content/sets/git/basic-commit.yaml', setYaml({}, `${filler}  - id: r\n    type: recall\n${body}`))],
        GUIDES,
      ),
    );

  it('placeholder 는 prompt 에도 나오고, 쓰인 것은 모두 정의돼야 한다', () => {
    expect(
      recall(
        '    prompt: <name> 브랜치 만들기\n    answers: ["git switch -c <name>"]\n    placeholder: { name: hotfix }\n',
      ),
    ).toEqual([]);
    expect(
      recall(
        '    prompt: 브랜치 만들기\n    answers: ["git switch -c <name>"]\n    placeholder: { name: hotfix }\n',
      )[0],
    ).toMatch(/prompt.*<name>/);
    expect(recall('    prompt: <name> 만들기\n    answers: ["git switch -c <name>"]\n')[0]).toMatch(/정의/);
  });

  it('Git 정답은 git 으로 시작한다', () => {
    expect(recall('    prompt: 상태 보기\n    answers: ["status"]\n')[0]).toMatch(/git 으로 시작/);
  });
});

describe('예상 시간', () => {
  it('분당 200타 기준 2~4분을 벗어나면 경고만 한다', () => {
    const r = buildContent(
      [file('content/sets/git/basic-commit.yaml', setYaml({}, '  - id: s\n    type: copy\n    text: git status\n'))],
      GUIDES,
    );
    expect(errors(r)).toEqual([]);
    expect(r.problems).toEqual([expect.objectContaining({ level: 'warning', message: expect.stringMatching(/예상/) })]);
  });
});
