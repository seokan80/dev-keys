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
    expect(set.lines[0]).toEqual({
      text: 'git status',
      comments: ['상태를 본다'],
      output: null,
      scene: null,
      graph: null,
      prompt: null,
      itemId: 'status',
    });
    expect(set.lines).toHaveLength(19);
  });

  it('코드 블록은 줄로 나누고, 문제 설명은 첫 줄 위에, 줄별 해설은 at 으로 찾은 줄 위에 단다', () => {
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
      {
        text: 'List<String> names = users.stream()',
        comments: ['전체 설명'],
        output: null,
        scene: null,
        graph: null,
        prompt: null,
        itemId: 'stream',
      },
      {
        text: '    .map(User::name)',
        comments: [],
        output: null,
        scene: null,
        graph: null,
        prompt: null,
        itemId: 'stream',
      },
      {
        text: '    .toList();',
        comments: ['수정할 수 없는 List'],
        output: null,
        scene: null,
        graph: null,
        prompt: null,
        itemId: 'stream',
      },
    ]);
  });
});

describe('명령 출력(output)', () => {
  const withOutput = (output: string) =>
    buildContent(
      [
        file(
          'content/sets/git/basic-commit.yaml',
          setYaml(
            {},
            `  - id: init\n    type: copy\n    text: git init\n    output: ${JSON.stringify(output)}\n${filler}`,
          ),
        ),
      ],
      GUIDES,
    );

  it('문제의 마지막 줄 뒤에 보여 줄 출력으로 붙는다', () => {
    const r = withOutput('Initialized empty Git repository in /home/kim/devkeys/.git/\n');
    expect(errors(r)).toEqual([]);
    expect(r.sets[0]!.lines[0]!.output).toBe('Initialized empty Git repository in /home/kim/devkeys/.git/');
  });

  it('출력도 ASCII · 탭 없음 · 줄 끝 공백 없음 · 100자 이하', () => {
    expect(errors(withOutput('완료'))[0]).toMatch(/output.*ASCII/);
    expect(errors(withOutput('a\tb'))[0]).toMatch(/output.*탭/);
    expect(errors(withOutput('ok '))[0]).toMatch(/output.*줄 끝 공백/);
    expect(errors(withOutput('x'.repeat(101)))[0]).toMatch(/output.*100자/);
  });

  it('출력은 앞 공백(들여쓰기)을 그대로 둔다', () => {
    expect(withOutput(' M README.md').sets[0]!.lines[0]!.output).toBe(' M README.md');
  });
});

describe('그림(scene) · 결과 값(result)', () => {
  const build = (item: string) =>
    buildContent([file('content/sets/git/basic-commit.yaml', setYaml({}, `${item}${filler}`))], GUIDES);

  it('scene 은 문제의 마지막 줄에 붙는다 (빠진 칸은 비어 있음)', () => {
    const r = build(
      [
        '  - id: add',
        '    type: copy',
        '    text: git add README.md',
        '    scene:',
        '      staged: [README.md (새 파일)]',
        '      arrow: { from: workdir, to: staged, label: add }',
        '      caption: 스테이징에 올렸다',
        '',
      ].join('\n'),
    );
    expect(errors(r)).toEqual([]);
    expect(r.sets[0]!.lines[0]!.scene).toEqual({
      workdir: [],
      staged: ['README.md (새 파일)'],
      repo: [],
      arrow: { from: 'workdir', to: 'staged', label: 'add' },
      caption: '스테이징에 올렸다',
    });
  });

  it('scene 의 칸 이름·비교 대상이 틀리면 오류', () => {
    const bad = (scene: string) =>
      errors(build(`  - id: x\n    type: copy\n    text: git status\n    scene:\n${scene}`))[0];
    expect(bad('      arrow: { from: desk, to: staged }\n      caption: x\n')).toMatch(/scene\.arrow\.from/);
    expect(bad('      compare: [workdir, workdir]\n      caption: x\n')).toMatch(/compare/);
    expect(bad('      staged: [a]\n')).toMatch(/caption/);
  });

  it('줄별 해설의 result 는 그 줄을 다 치면 아래에 보인다 (문제 출력과 같은 줄이면 이어 붙인다)', () => {
    const r = build(
      [
        '  - id: s',
        '    type: copy',
        '    text: "int total = list.size();"',
        '    output: done',
        '    notes:',
        '      - at: size()',
        '        note: 개수',
        "        result: 'total -> 3'",
        '',
      ].join('\n'),
    );
    expect(errors(r)).toEqual([]);
    expect(r.sets[0]!.lines[0]!.output).toBe('total -> 3\ndone');
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

  it('탭·줄 끝 공백·긴 줄(Git 100자 · 코드 80자)·앞뒤 빈 줄', () => {
    expect(withText('a\n\tb')[0]).toMatch(/2번째 줄.*탭/);
    expect(withText('git status ')[0]).toMatch(/줄 끝 공백/);
    // 터미널 명령(Git)은 한 줄로 길어지기 쉬워 100자까지, 코드는 읽기 좋게 80자까지
    expect(withText('x'.repeat(100))).toEqual([]);
    expect(withText('x'.repeat(101))[0]).toMatch(/100자/);
    const code = (text: string) =>
      errors(
        buildContent(
          [
            file(
              'content/sets/java/basics.yaml',
              setYaml(
                { id: 'java-basics', category: 'java' },
                `  - id: t\n    type: copy\n    text: ${JSON.stringify(text)}\n${filler.replaceAll('git log --oneline --graph --all', 'list.stream().map(x -> x).toList();')}`,
              ),
            ),
          ],
          ['content/guides/java/basics.md'],
        ),
      );
    expect(code('x'.repeat(80))).toEqual([]);
    expect(code('x'.repeat(81))[0]).toMatch(/80자/);
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

describe('대화형 답 줄 (prompt)', () => {
  const withItems = (items: string) =>
    buildContent([file('content/sets/git/basic-commit.yaml', setYaml({}, `${items}${filler}`))], GUIDES);

  it('prompt 가 있는 줄은 $ 대신 그 질문을 앞에 보여 준다 (git add -p 의 y · n)', () => {
    const r = withItems(
      [
        '  - id: add-p',
        '    type: copy',
        '    text: git add -p',
        '  - id: yes',
        '    type: copy',
        '    text: y',
        "    prompt: '(1/2) Stage this hunk [y,n,q,a,d,k,K,j,J,g,/,e,p,P,?]?'",
        '',
      ].join('\n'),
    );
    expect(errors(r)).toEqual([]);
    const [addP, yes] = r.sets[0]!.lines;
    expect(addP!.prompt).toBeNull();
    expect(yes!.prompt).toBe('(1/2) Stage this hunk [y,n,q,a,d,k,K,j,J,g,/,e,p,P,?]?');
  });

  it('prompt 는 한 줄 답에만, ASCII 만', () => {
    const multi = withItems('  - id: x\n    type: copy\n    text: "y\\nn"\n    prompt: \'Stage?\'\n');
    expect(errors(multi)[0]).toMatch(/prompt.*한 줄/);
    const korean = withItems("  - id: x\n    type: copy\n    text: y\n    prompt: '계속?'\n");
    expect(errors(korean)[0]).toMatch(/prompt.*ASCII/);
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

  it('context 준비 명령은 엔진에서 돌아야 한다', () => {
    expect(
      recall('    prompt: 이동\n    answers: ["git switch main"]\n    context: { setup: ["git switch nope"] }\n')[0],
    ).toMatch(/context.*git switch nope.*invalid reference/);
  });

  it('context 가 있으면 정답들은 엔진에서 모두 같은 결과여야 한다 (동의어가 맞는지 엔진이 검사)', () => {
    const ok =
      '    prompt: 만들고 이동\n    answers: ["git switch -c x", "git checkout -b x"]\n    context: { setup: [] }\n';
    expect(recall(ok)).toEqual([]);
    expect(
      recall(
        '    prompt: 만들고 이동\n    answers: ["git switch -c x", "git branch x"]\n    context: { setup: [] }\n',
      )[0],
    ).toMatch(/정답 "git branch x".*첫 정답과 결과가 다르다/);
    expect(recall('    prompt: 치워 두기\n    answers: ["git stash"]\n    context: { setup: [] }\n')[0]).toMatch(
      /정답 "git stash".*엔진/,
    );
  });

  it('문제는 placeholder 를 채워 세트에 담긴다 (prompt 는 채운 값을 표시할 수 있게 조각으로)', () => {
    const r = buildContent(
      [
        file(
          'content/sets/git/basic-commit.yaml',
          setYaml(
            {},
            `${filler}  - id: create\n    type: recall\n    prompt: <name> 브랜치를 만들고 이동\n    answers: ["git switch -c <name>", "git checkout -b <name>"]\n    placeholder: { name: hotfix }\n    context: { setup: [] }\n    note: 만들면서 이동\n`,
          ),
        ),
      ],
      GUIDES,
    );
    expect(r.sets[0]!.recalls).toEqual([
      {
        key: 'git-basic-commit/create',
        setId: 'git-basic-commit',
        itemId: 'create',
        prompt: [
          { text: 'hotfix', value: true },
          { text: ' 브랜치를 만들고 이동', value: false },
        ],
        answers: ['git switch -c hotfix', 'git checkout -b hotfix'],
        context: { setup: [] },
        note: '만들면서 이동',
      },
    ]);
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

describe('엔진으로 도는 세트 (트리 그림)', () => {
  // 엔진에서 빼는 채움 줄 (log 는 엔진이 모르는 명령)
  const quiet = Array.from(
    { length: 16 },
    (_, i) => `  - id: q${i}\n    type: copy\n    text: git log --oneline --graph --all\n    skipEngine: true\n`,
  ).join('');
  const engineSet = (items: string, head = "engine: { root: '3f2a9c1 docs: add README' }\n") =>
    buildContent(
      [
        file(
          'content/sets/git/basic-commit.yaml',
          setYaml().replace(/\nitems:\n[\s\S]*$/, `\n${head}items:\n${items}${quiet}`),
        ),
      ],
      GUIDES,
    );

  it('명령마다 엔진 상태를 이어 가며 그래프 단계를 쌓고, 줄마다 치는 동안 · 끝낸 뒤 단계와 설명을 붙인다', () => {
    const r = engineSet(
      [
        '  - id: create',
        '    type: copy',
        '    text: git branch feature',
        '    tree: { caption: 이름표가 붙었다 }',
        '  - id: switch',
        '    type: copy',
        '    text: git switch feature',
        '  - id: back',
        '    type: copy',
        '    text: git switch main',
        '    before: [\'git commit -m "a1b2c3d feat: login"\']',
        '  - id: merge',
        '    type: copy',
        '    text: git merge --no-ff feature',
        '    hash: e4f5a6b',
        '    tree: { caption: 머지 커밋 }',
        '',
      ].join('\n'),
    );
    expect(errors(r)).toEqual([]);
    const set = r.sets[0]!;
    const [create, sw, back, merge, quiet] = set.lines;
    // 단계: 0 시작 · 1 branch · 2 switch · 3 숨은 커밋(before) · 4 switch main · 5 merge
    expect(create!.graph).toEqual({ during: 0, after: 1, caption: '이름표가 붙었다' });
    expect(sw!.graph).toEqual({ during: 1, after: 2, caption: null });
    expect(back!.graph).toEqual({ during: 3, after: 4, caption: null }); // 숨은 커밋은 그 줄을 시작할 때 나타난다
    expect(merge!.graph).toEqual({ during: 4, after: 5, caption: '머지 커밋' });
    expect(quiet!.graph).toEqual({ during: 5, after: 5, caption: null }); // 엔진에서 뺀 줄은 그대로
    const g = set.graph!;
    expect(g.steps).toHaveLength(6);
    expect(g.steps[0]!.branches).toEqual({ main: 'c1' });
    expect(g.steps[1]!.branches).toEqual({ main: 'c1', feature: 'c1' });
    expect(g.steps[5]!.commits.c3!.parents).toEqual(['c1', 'c2']);
    expect(g.names).toEqual({
      c1: '3f2a9c1 docs: add README',
      c2: 'a1b2c3d feat: login',
      c3: "e4f5a6b Merge branch 'feature'",
    });
    // 배치는 한 번 정한 자리를 바꾸지 않으니 마지막 배치 하나로 모든 단계를 그린다
    expect(g.layout).toEqual({ c1: { lane: 0, row: 0 }, c2: { lane: 1, row: 1 }, c3: { lane: 0, row: 2 } });
  });

  it('되돌린 커밋(revert)의 설명도 원본 메시지 안의 해시를 뺀다', () => {
    const r = engineSet(
      [
        '  - id: back',
        '    type: copy',
        '    text: git revert --no-edit HEAD',
        '    before: [\'git commit -m "a1b2c3d feat: login"\']',
        '    as: git revert HEAD',
        '    hash: e4f5a6b',
        '',
      ].join('\n'),
    );
    expect(errors(r)).toEqual([]);
    expect(r.sets[0]!.graph!.names.c3).toBe('e4f5a6b Revert "feat: login"');
  });

  it('엔진이 모르는 명령은 as 로 엔진에서 돌릴 명령을 준다 (worktree add -b → git branch)', () => {
    const r = engineSet(
      [
        '  - id: wt',
        '    type: copy',
        '    text: git worktree add ../devkeys-search -b agent/search',
        '    as: git branch agent/search',
        '    tree: { caption: 에이전트 브랜치 }',
        '',
      ].join('\n'),
    );
    expect(errors(r)).toEqual([]);
    const [wt] = r.sets[0]!.lines;
    expect(wt!.graph).toEqual({ during: 0, after: 1, caption: '에이전트 브랜치' });
    expect(r.sets[0]!.graph!.steps[1]!.branches).toEqual({ main: 'c1', 'agent/search': 'c1' });
  });

  it('엔진 세트가 아니면 그래프가 없다', () => {
    const plain = buildContent([file('content/sets/git/basic-commit.yaml', setYaml())], GUIDES);
    expect(plain.sets[0]!.graph).toBeNull();
  });

  it('복사한 커밋(cherry-pick)의 설명은 새 해시 + 원본 메시지 (원본 메시지 앞의 해시는 뺀다)', () => {
    const r = engineSet(
      [
        '  - id: side',
        '    type: copy',
        '    text: git switch -c side',
        '  - id: back',
        '    type: copy',
        '    text: git switch side',
        '    before: [git switch main, \'git commit -m "a1b2c3d feat: login"\']',
        '  - id: pick',
        '    type: copy',
        '    text: git cherry-pick main',
        '    hash: 5307cb3',
        '    tree: { caption: 복사했다 }',
        '',
      ].join('\n'),
    );
    expect(errors(r)).toEqual([]);
    expect(r.sets[0]!.graph!.names).toEqual({
      c1: '3f2a9c1 docs: add README',
      c2: 'a1b2c3d feat: login',
      c3: '5307cb3 feat: login',
    });
  });

  it('엔진에서 실패하는 명령 · 숨은 명령은 오류 (콘텐츠의 Git 흐름을 엔진이 검사한다)', () => {
    const one = (item: string) => errors(engineSet(item))[0];
    expect(one('  - id: x\n    type: copy\n    text: git switch nope\n')).toMatch(/엔진.*invalid reference: nope/);
    expect(one("  - id: x\n    type: copy\n    text: git branch\n    before: ['git merge nope']\n")).toMatch(
      /before.*not something we can merge/,
    );
  });

  it('형식 규칙: tree 는 엔진에서 도는 줄에만, 엔진 세트의 명령은 한 줄, 엔진 칸은 엔진 세트에서만', () => {
    expect(
      errors(
        engineSet('  - id: x\n    type: copy\n    text: git stash\n    skipEngine: true\n    tree: { caption: c }\n'),
      )[0],
    ).toMatch(/tree.*skipEngine/);
    expect(
      errors(
        engineSet('  - id: x\n    type: copy\n    text: git stash\n    skipEngine: true\n    as: git branch a\n'),
      )[0],
    ).toMatch(/as.*skipEngine/);
    expect(errors(engineSet('  - id: x\n    type: copy\n    text: "git branch a\\ngit branch b"\n'))[0]).toMatch(
      /한 줄/,
    );
    const plain = buildContent(
      [
        file(
          'content/sets/git/basic-commit.yaml',
          setYaml({}, `  - id: x\n    type: copy\n    text: git branch\n    tree: { caption: c }\n${filler}`),
        ),
      ],
      GUIDES,
    );
    expect(errors(plain)[0]).toMatch(/engine/);
  });
});
