// 검색 엔진에 알려 줄 주소 목록. 검색에서 뺀 화면(noindex — 도전 모드 · 내 기록 · 연습장)은 넣지 않는다
import type { APIRoute } from 'astro';
import { getMissions, getSets } from '../lib/content/load';
import { CATEGORIES } from '../schemas/categories';

export const GET: APIRoute = ({ site }) => {
  const paths = [
    '/',
    '/about',
    '/privacy',
    '/warmup',
    ...CATEGORIES.map((c) => `/${c.id}`),
    ...getSets().map((s) => s.href),
    '/git/tree',
    ...getMissions().map((m) => m.href),
  ];
  const urls = paths.map((p) => `  <url><loc>${new URL(p, site).href}</loc></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
