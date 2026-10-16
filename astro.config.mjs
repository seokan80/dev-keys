// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// 정적 사이트로 빌드해 Cloudflare Workers 정적 자산으로 배포한다 (docs/구현계획.md 1.2 #1).
export default defineConfig({
  site: 'https://dev-keys.seokan.workers.dev',
  output: 'static',
  // 주소는 끝 슬래시 없이 (/git/basic-branch). 파일을 page.html 로 만들어 Workers 정적 자산이 리다이렉트하지 않게 한다.
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
