// @ts-check
import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default defineConfig(
  { ignores: ['dist/', '.astro/', '.wrangler/', 'coverage/', 'playwright-report/', 'test-results/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    // src/core 는 UI·브라우저와 분리된 순수 로직이다 (계획서 3장 원칙).
    // 시각·난수·저장소는 인자로 주입받는다.
    files: ['src/core/**/*.{ts,tsx}'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*', 'react-dom/*'],
              message: 'src/core 는 React 에 의존하지 않는다.',
            },
            { group: ['astro', 'astro:*', 'astro/*', '@astrojs/*'], message: 'src/core 는 Astro 에 의존하지 않는다.' },
            { group: ['@components/*', '**/components/**'], message: 'src/core 는 UI 컴포넌트를 가져오지 않는다.' },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        ...['window', 'document', 'navigator', 'localStorage', 'sessionStorage', 'location', 'fetch'].map((name) => ({
          name,
          message: 'src/core 는 브라우저 API 를 쓰지 않는다. 필요한 값은 인자로 받는다.',
        })),
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Date', property: 'now', message: '현재 시각은 인자(now)로 받는다.' },
        { object: 'Math', property: 'random', message: '난수는 인자(rng)로 받는다.' },
      ],
    },
  },
);
