import { describe, expect, it } from 'vitest';
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
  it('도전 문제의 상황이 해설보다 무겁다', () => {
    expect(slugs('메시지')[0]).toBe('commit-amend-m');
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
