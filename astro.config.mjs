// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// 정적 사이트로 빌드해 Cloudflare Workers 정적 자산으로 배포한다 (docs/구현계획.md 1.2 #1).
export default defineConfig({
  site: 'https://dev-keys.seokan.workers.dev',
  output: 'static',
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
