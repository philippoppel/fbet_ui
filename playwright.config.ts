import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const IS_CI = !!process.env.CI;
const HEADLESS = process.env.HEADLESS !== 'false';
const WORKERS = process.env.PW_WORKERS
  ? Number(process.env.PW_WORKERS)
  : undefined;

// Dynamisches Webserver Command
const webServerCommand = 'npm run dev';

export default defineConfig({
  testDir: './tests/e2e',

  timeout: 30_000,

  expect: {
    timeout: 5000,
  },

  fullyParallel: true,

  forbidOnly: IS_CI,

  retries: IS_CI ? 2 : 0,

  workers: WORKERS,

  reporter: [['dot'], ['html', { open: 'never' }]],

  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    headless: HEADLESS,
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',

  outputDir: 'test-results/',

  webServer: {
    command: webServerCommand,
    url: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    reuseExistingServer: !IS_CI,
    timeout: 120 * 1000,
  },
});
