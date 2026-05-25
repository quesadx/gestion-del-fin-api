import { defineConfig } from '@playwright/test';

const TARGET_URL = process.env.PERF_TARGET_URL ?? 'http://localhost:3000';
const IS_DEPLOYED = TARGET_URL !== 'http://localhost:3000';

export default defineConfig({
  testDir: './tests/perf',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  globalSetup: IS_DEPLOYED ? undefined : './tests/e2e/global.setup.ts',
  globalTeardown: IS_DEPLOYED ? undefined : './tests/e2e/global.teardown.ts',
  use: {
    baseURL: TARGET_URL,
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
  },
  ...(IS_DEPLOYED
    ? {}
    : {
        webServer: {
          command: 'npx dotenv -e .env.test -- tsx src/index.ts',
          url: 'http://localhost:3000/api/system/time',
          reuseExistingServer: true,
          timeout: 30_000,
          env: { NODE_ENV: 'test' },
        },
      }),
});
