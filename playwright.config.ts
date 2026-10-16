import { defineConfig, devices } from '@playwright/test';

// E2E_BASE_URL 이 있으면 그 주소(배포 미리보기)를, 없으면 로컬 빌드 결과를 시험한다.
// 로컬 서버는 배포와 같은 방식(정적 자산 + 404 페이지)으로 띄우려고 wrangler dev 를 쓴다.
// (astro preview 는 AI 에이전트 환경에서 백그라운드로 떠서 Playwright 가 서버를 놓친다.)
const baseURL = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: baseURL ?? 'http://127.0.0.1:4321',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: baseURL
    ? undefined
    : {
        command: 'npm run build && npx wrangler dev --port 4321 --ip 127.0.0.1',
        url: 'http://127.0.0.1:4321',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
