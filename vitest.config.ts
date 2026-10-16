import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
      '@schemas': fileURLToPath(new URL('./src/schemas', import.meta.url)),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts', 'src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/core/**', 'src/schemas/**', 'scripts/lib/**'],
      reporter: ['text-summary', 'html'],
      thresholds: {
        // core 는 90% 이상. Git 엔진은 M3 완료 기준이기도 하다.
        'src/core/**': { lines: 90, functions: 90, branches: 90, statements: 90 },
      },
    },
  },
});
