import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 15_000,
  expect: { timeout: 5_000 },
  globalSetup: './tests/e2e/global.setup.ts',
  globalTeardown: './tests/e2e/global.teardown.ts',
  use: {
    baseURL: 'http://localhost:3000',
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
  },
  webServer: {
    command: 'npx dotenv -e .env.test -- tsx src/index.ts',
    url: 'http://localhost:3000/api/system/time',
    reuseExistingServer: true,
    timeout: 30_000,
    env: {
      NODE_ENV: 'test',
    },
  },
  projects: [
    {
      name: 'e2e',
      testMatch: '*.spec.ts',
    },
  ],
});
