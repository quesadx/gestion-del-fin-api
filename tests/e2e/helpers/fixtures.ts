// tests/e2e/helpers/fixtures.ts
import { test as base, type APIRequestContext } from '@playwright/test';
import { loadTokens } from './auth';

// Re-export everything from @playwright/test so spec files only import from here
export * from '@playwright/test';

type ApiFixtures = {
  adminRequest: APIRequestContext;
  adminCamp2Request: APIRequestContext;
  workerCamp1Request: APIRequestContext;
  workerCamp2Request: APIRequestContext;
  resourceMgrRequest: APIRequestContext;
  travelCoordRequest: APIRequestContext;
};

function createAuthContext(
  playwright: Parameters<Parameters<typeof base.extend>[0][keyof ApiFixtures]>[0]['playwright'],
  token: string,
): Promise<APIRequestContext> {
  return playwright.request.newContext({
    baseURL: 'http://localhost:3000',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
}

export const test = base.extend<ApiFixtures>({
  adminRequest: async ({ playwright }, use) => {
    const tokens = loadTokens();
    const ctx = await createAuthContext(playwright, tokens.admin_camp1);
    await use(ctx);
    await ctx.dispose();
  },
  adminCamp2Request: async ({ playwright }, use) => {
    const tokens = loadTokens();
    const ctx = await createAuthContext(playwright, tokens.admin_camp2);
    await use(ctx);
    await ctx.dispose();
  },
  workerCamp1Request: async ({ playwright }, use) => {
    const tokens = loadTokens();
    const ctx = await createAuthContext(playwright, tokens.worker_camp1);
    await use(ctx);
    await ctx.dispose();
  },
  workerCamp2Request: async ({ playwright }, use) => {
    const tokens = loadTokens();
    const ctx = await createAuthContext(playwright, tokens.worker_camp2);
    await use(ctx);
    await ctx.dispose();
  },
  resourceMgrRequest: async ({ playwright }, use) => {
    const tokens = loadTokens();
    const ctx = await createAuthContext(playwright, tokens.resource_mgr_camp1);
    await use(ctx);
    await ctx.dispose();
  },
  travelCoordRequest: async ({ playwright }, use) => {
    const tokens = loadTokens();
    const ctx = await createAuthContext(playwright, tokens.travel_coord_camp1);
    await use(ctx);
    await ctx.dispose();
  },
});
