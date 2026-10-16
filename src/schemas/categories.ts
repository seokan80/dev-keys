/** 카테고리 = 주소 첫 칸 (/git, /java, /spring). 순서가 메인·다음 세트 추천 순서다. */
export const CATEGORIES = [
  { id: 'git', title: 'Git', description: '자주 쓰는 Git 명령을 손에 익히기' },
  { id: 'java', title: 'Java', description: 'Stream · Optional · record 처럼 자주 쓰는 Java 문법' },
  { id: 'spring', title: 'Spring', description: 'Spring Boot · Spring Security 레퍼런스 코드' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];

export const categoryOf = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)!;
