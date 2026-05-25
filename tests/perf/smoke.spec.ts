import { test, expect, request } from '@playwright/test';
import { login, authHeader } from './auth';

let baseURL: string;
let token: string;

test.beforeAll(async () => {
  baseURL = process.env.PERF_TARGET_URL ?? 'http://localhost:3000';
  const session = await login(baseURL);
  token = session.token;
});

test.describe('Public endpoints', () => {
  test('GET / returns 200', async () => {
    const ctx = await request.newContext({ baseURL });
    const res = await ctx.get('/');
    expect(res.status()).toBe(200);
    await ctx.dispose();
  });

  test('GET /api/system/time returns 200 (no auth required)', async () => {
    const ctx = await request.newContext({ baseURL });
    const res = await ctx.get('/api/system/time');
    expect(res.status()).toBe(200);
    await ctx.dispose();
  });
});

test.describe('Authenticated list endpoints', () => {
  const endpoints = [
    '/api/camps',
    '/api/professions',
    '/api/resources',
    '/api/users',
    '/api/roles',
    '/api/permissions',
    '/api/expeditions',
    '/api/transfers',
  ];

  for (const ep of endpoints) {
    test(`GET ${ep} returns data array`, async () => {
      const ctx = await request.newContext({
        baseURL,
        extraHTTPHeaders: authHeader(token),
      });
      const res = await ctx.get(ep);
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body).toHaveProperty('data');
      expect(Array.isArray(body.data)).toBe(true);
      await ctx.dispose();
    });
  }
});

test.describe('Protected endpoints require auth', () => {
  const endpoints = [
    '/api/camps',
    '/api/professions',
    '/api/resources',
    '/api/users',
    '/api/roles',
    '/api/permissions',
    '/api/expeditions',
    '/api/transfers',
    '/api/admission/camps/1',
    '/api/inventory/1',
    '/api/metrics/dashboard',
  ];

  for (const ep of endpoints) {
    test(`GET ${ep} returns 401 when unauthenticated`, async () => {
      const ctx = await request.newContext({ baseURL });
      const res = await ctx.get(ep);
      expect(res.status()).toBe(401);
      await ctx.dispose();
    });
  }
});
