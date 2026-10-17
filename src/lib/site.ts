// 사이트 이름 · 저장소 · 신고 주소를 한 곳에. 사이트 주소(도메인)는 astro.config.mjs 의 site 하나만 바꾼다
export const SITE_NAME = 'DevKeys';
export const SITE_TAGLINE = '치면서 익히는 개발';
export const REPO_URL = 'https://github.com/seokan80/dev-keys';

/** 콘텐츠 오류 신고: 저장소의 "문제 신고" 이슈 양식(.github/ISSUE_TEMPLATE/content-report.yml)에 제목 · 어디서를 미리 채운다 */
export function reportUrl(what: string, page: URL): string {
  const params = new URLSearchParams({
    template: 'content-report.yml',
    title: `[신고] ${what}`,
    where: `${page.href} — ${what}`,
  });
  return `${REPO_URL}/issues/new?${params}`;
}
