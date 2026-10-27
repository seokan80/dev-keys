import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { searchEntriesOf } from '../../../src/lib/commands/catalog';
import { loadContent } from '../../../src/lib/content/load';
import { searchCommands, type SearchEntry } from '../../../src/lib/commands/search';

const entries: SearchEntry[] = [
  { slug: 'commit-amend-m', display: 'git commit --amend -m', situations: '마지막 커밋의 메시지를 고친다', notes: '' },
  {
    slug: 'rebase-i',
    display: 'git rebase -i',
    situations: '쌓인 내 커밋들을 골라 합치고 순서를 바꾼다',
    notes: 'fixup 은 커밋에 합치고 메시지는 버린다. squash 는 메시지도 합친다',
  },
  { slug: 'commit-m', display: 'git commit -m', situations: '', notes: '담은 변경을 메시지와 함께 커밋한다' },
  { slug: 'restore-staged', display: 'git restore --staged', situations: '스테이징에서 내린다', notes: '' },
  {
    slug: 'config-pull-rebase',
    display: 'git config set --global pull.rebase true',
    situations: '앞으로 pull 은 늘 rebase 로',
    notes: '',
  },
];
const slugs = (q: string) => searchCommands(entries, q).map((r) => r.slug);

describe('searchCommands', () => {
  const remote: SearchEntry[] = [
    { slug: 'pull', display: 'git pull', situations: '원격 변경을 가져와서 합친다', notes: '' },
    { slug: 'fetch', display: 'git fetch', situations: '원격 변경 가져오기만', notes: '' },
    { slug: 'merge', display: 'git merge', situations: '브랜치를 합치기', notes: '' },
  ];

  it.each(['원격 변경 받아 오기만 하고 합치진 않기', '원격 변경 가져오되 합치지 않고', '원격 변경 안 합치고 받기'])(
    '부정한 동작을 긍정 일치로 세지 않는다: %s',
    (query) => {
      expect(searchCommands(remote, query)[0]?.slug).toBe('fetch');
    },
  );

  it('긍정한 합치기는 여전히 pull을 먼저 찾는다', () => {
    expect(searchCommands(remote, '원격 변경 가져와서 합치기')[0]?.slug).toBe('pull');
  });

  it('문장 안에서 부정한 동작은 긍정한 검색어의 근거가 되지 않는다', () => {
    const entries = [
      { slug: 'negative', display: 'git fetch', situations: '원격 변경을 합치지 않는다', notes: '' },
      { slug: 'positive', display: 'git pull', situations: '원격 변경을 합친다', notes: '' },
    ];
    expect(searchCommands(entries, '원격 변경 합치기')[0]?.slug).toBe('positive');
  });

  it('부정어만 겹치는 무관한 명령을 검색 결과에 보태지 않는다', () => {
    expect(searchCommands(remote, '쿠버네티스 합치지 않기')).toEqual([]);
  });

  it('한정한 동작이 상황에 있는 명령을 해설에서만 언급한 명령보다 먼저 찾는다', () => {
    expect(
      searchCommands(
        [
          { slug: 'other', display: 'git push', situations: '동료가 올린 내용을 덮어쓴다', notes: '먼저 가져오기' },
          { slug: 'receive', display: 'git fetch', situations: '변경 가져오기만', notes: '' },
        ],
        '동료가 올린 거 받아만 오고 합치진 않기',
      )[0]?.slug,
    ).toBe('receive');
  });

  it('도전 문제의 상황이 해설보다 무겁다', () => {
    expect(slugs('메시지')[0]).toBe('commit-amend-m');
  });

  it('별칭은 별명 또는 alias로도 찾는다', () => {
    expect(
      searchCommands(
        [{ slug: 'alias', display: 'git config set alias.lg', situations: '긴 명령에 별명 붙이기', notes: '' }],
        '별칭',
      )[0]?.slug,
    ).toBe('alias');
  });

  it('질문이 상황 문장에 붙은 그대로 들어 있으면 낱말이 흩어져 맞는 것보다 위', () => {
    const r = searchCommands(
      [
        {
          slug: 'scattered',
          display: 'git reset --soft',
          situations: '커밋을 취소하되 변경은 스테이징된 채로',
          notes: '',
        },
        { slug: 'phrase', display: 'git restore --staged', situations: '스테이징 취소하기', notes: '' },
      ],
      '스테이징 취소',
    );
    expect(r[0]!.slug).toBe('phrase');
  });

  it('같은 뜻의 다른 말로도 찾는다 — 커밋 아이디 · id 는 해시, 조회는 보기', () => {
    const entries = [
      { slug: 'add', display: 'git add', situations: '변경 파일을 커밋할 목록에 올리기', notes: '' },
      {
        slug: 'show-name-only',
        display: 'git show --name-only',
        situations: '커밋 해시로 변경 파일 목록 보기',
        notes: '',
      },
    ];
    expect(searchCommands(entries, '커밋 아이디로 변경 파일 목록 조회')[0]!.slug).toBe('show-name-only');
    expect(searchCommands(entries, '커밋 id 로 변경 파일 목록')[0]!.slug).toBe('show-name-only');
  });

  it('조사만 띄어 쓴 낱말("id 로")은 버린다', () => {
    const entries = [{ slug: 'log', display: 'git log', situations: '로그 보기', notes: '' }];
    expect(searchCommands(entries, '로')).toEqual([]);
  });

  it('명령 조각으로 찾는다', () => {
    expect(slugs('amend')[0]).toBe('commit-amend-m');
    expect(slugs('git restore')[0]).toBe('restore-staged');
  });

  it('한국어 상황으로 찾는다 — 조사가 달라도', () => {
    // 고치고 · 고친다 처럼 활용해 글자가 바뀌어도 (받침을 떼고 비교), "싶어" 같은 말은 빼고
    expect(slugs('커밋 메시지를 고치고 싶어')[0]).toBe('commit-amend-m');
    expect(slugs('커밋 순서 바꾸는 방법')[0]).toBe('rebase-i');
    expect(slugs('스테이징 내리기')[0]).toBe('restore-staged');
    expect(slugs('pull 할 때 rebase')[0]).toBe('config-pull-rebase');
  });

  it('빈 검색어 · 맞는 것이 없으면 빈 목록', () => {
    expect(slugs('  ')).toEqual([]);
    expect(slugs('쿠버네티스')).toEqual([]);
  });
});

describe('실제 카탈로그에서 동작과 제외 조건 구분', () => {
  const entries = searchEntriesOf(loadContent(join(import.meta.dirname, '../../..')).catalog);

  it.each([
    ['동료가 올린 거 받아만 오고 합치진 않기', 'fetch'],
    ['원격 변경 받아 오기만 하고 합치진 않기', 'fetch'],
    ['원격 변경 안 합치고 받기', 'fetch'],
    ['원격 변경 가져와서 합치기', 'pull'],
    ['아직 안 합친 브랜치 찾기', 'branch-no-merged'],
    ['자주 쓰는 명령 별칭 만들기', 'config-alias-lg'],
  ])('%s → %s', (query, expected) => {
    expect(searchCommands(entries, query)[0]?.slug).toBe(expected);
  });
});
