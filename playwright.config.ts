import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 15_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: 'http://localhost:3000/api',
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
  },
  webServer: {
    command: 'npx dotenv -e .env.test -- tsx src/index.ts',
    url: 'http://localhost:3000/api/system/time',
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      NODE_ENV: 'test',
    },
  },
  projects: [
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
      teardown: 'teardown',
    },
    {
      name: 'teardown',
      testMatch: /global\.teardown\.ts/,
    },
    {
      name: 'e2e',
      testMatch: '*.spec.ts',
      dependencies: ['setup'],
    },
  ],
});
