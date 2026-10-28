/**
 * 카테고리 = 주소 첫 칸 (/git, /java, /spring). 순서가 메인·다음 세트 추천 순서다.
 * comment: 줄 위 해설에 붙는 주석 표시, prompt: 줄 앞 표시 (터미널의 $), result: 결과 값 앞 표시
 */
export const CATEGORIES = [
  { id: 'git', title: 'Git', description: '자주 쓰는 Git 명령을 손에 익히기', comment: '#', prompt: '$' },
  {
    id: 'shell',
    title: 'Shell',
    description: 'Bash와 GNU 도구로 파일을 다루고 로그를 찾기',
    comment: '#',
    prompt: '$',
  },
  {
    id: 'java',
    title: 'Java',
    description: 'Stream · Optional · record 처럼 자주 쓰는 Java 문법',
    comment: '//',
    result: '⇒',
  },
  {
    id: 'spring',
    title: 'Spring',
    description: 'Spring Boot · Spring Security 레퍼런스 코드',
    comment: '//',
    result: '⇒',
  },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];

export const categoryOf = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)!;
