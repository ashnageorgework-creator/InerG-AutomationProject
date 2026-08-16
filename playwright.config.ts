import { defineConfig, devices } from '@playwright/test';
import { baseUrl } from './config';

export default defineConfig({
  testDir: './tests',
  timeout: 45000,
  retries: 1,
  workers: 1, // known cross-session state contamination on this site, see v1 project - do not raise this without re-testing for it first
  reporter: [['html', { outputFolder: 'playwright-report', open: 'on-failure' }]],

  use: {
    baseURL: baseUrl,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    headless: true,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
