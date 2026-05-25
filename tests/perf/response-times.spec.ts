import { test, expect, request } from '@playwright/test';
import { login } from './auth';

const RESPONSE_TIME_MS = 2000;
const SLOW_ENDPOINT_MS = 5000;

let baseURL: string;
let token: string;

test.beforeAll(async () => {
  baseURL = process.env.PERF_TARGET_URL ?? 'http://localhost:3000';
  const session = await login(baseURL);
  token = session.token;
});

test.describe('Response time benchmarks', () => {
  const benchmarks: { name: string; path: string; maxMs: number }[] = [
    { name: 'system time', path: '/api/system/time', maxMs: RESPONSE_TIME_MS },
    { name: 'health root', path: '/', maxMs: RESPONSE_TIME_MS },
    { name: 'list camps', path: '/api/camps', maxMs: RESPONSE_TIME_MS },
    { name: 'list professions', path: '/api/professions', maxMs: RESPONSE_TIME_MS },
    { name: 'list resources', path: '/api/resources', maxMs: RESPONSE_TIME_MS },
    { name: 'list users', path: '/api/users', maxMs: RESPONSE_TIME_MS },
    { name: 'list roles', path: '/api/roles', maxMs: RESPONSE_TIME_MS },
    { name: 'list permissions', path: '/api/permissions', maxMs: RESPONSE_TIME_MS },
    { name: 'list expeditions', path: '/api/expeditions', maxMs: RESPONSE_TIME_MS },
    { name: 'list transfers', path: '/api/transfers', maxMs: RESPONSE_TIME_MS },
    { name: 'dashboard metrics', path: '/api/metrics/dashboard', maxMs: SLOW_ENDPOINT_MS },
    { name: 'resource metrics', path: '/api/metrics/resources', maxMs: SLOW_ENDPOINT_MS },
    { name: 'people metrics', path: '/api/metrics/people', maxMs: SLOW_ENDPOINT_MS },
    { name: 'expedition metrics', path: '/api/metrics/expeditions', maxMs: SLOW_ENDPOINT_MS },
    { name: 'inventory camp 1', path: '/api/inventory/1', maxMs: RESPONSE_TIME_MS },
    { name: 'admission list camp 1', path: '/api/admission/camps/1', maxMs: RESPONSE_TIME_MS },
  ];

  for (const b of benchmarks) {
    test(`${b.name}: responds within ${b.maxMs}ms`, async () => {
      const needsAuth = !b.path.startsWith('/api/system') && b.path !== '/';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (needsAuth) headers['Authorization'] = `Bearer ${token}`;

      const ctx = await request.newContext({ baseURL, extraHTTPHeaders: headers });
      const start = Date.now();
      const res = await ctx.get(b.path);
      const elapsed = Date.now() - start;

      expect(res.ok()).toBeTruthy();
      expect(elapsed).toBeLessThan(b.maxMs);
      await ctx.dispose();
    });
  }

  test('auth login responds within 3000ms', async () => {
    const ctx = await request.newContext({ baseURL });
    const start = Date.now();
    const res = await ctx.post('/api/auth/login', {
      data: {
        username: process.env.E2E_USER ?? 'admin_master',
        password: process.env.E2E_PASS ?? 'test-password-123',
      },
    });
    const elapsed = Date.now() - start;
    expect(res.ok()).toBeTruthy();
    expect(elapsed).toBeLessThan(3000);
    await ctx.dispose();
  });
});
