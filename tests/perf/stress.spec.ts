import { test, expect, request } from '@playwright/test';
import { login } from './auth';

const CONCURRENT_REQUESTS = 10;
const STRESS_TIMEOUT_MS = 30_000;

let baseURL: string;
let token: string;

test.beforeAll(async () => {
  baseURL = process.env.PERF_TARGET_URL ?? 'http://localhost:3000';
  const session = await login(baseURL);
  token = session.token;
});

test.describe('Concurrent request stress tests', () => {
  test(`GET /api/camps handles ${CONCURRENT_REQUESTS} concurrent requests`, async () => {
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const ctx = await request.newContext({ baseURL, extraHTTPHeaders: headers });

    const requests = Array.from({ length: CONCURRENT_REQUESTS }, () => ctx.get('/api/camps'));
    const results = await Promise.all(requests.map((r, i) =>
      r.then(async (res) => ({ ok: res.ok(), status: res.status(), body: await res.json(), idx: i })),
    ));

    const allOk = results.every((r) => r.ok);
    expect(allOk).toBe(true);

    for (const r of results) {
      expect(r.body).toHaveProperty('data');
      expect(Array.isArray(r.body.data)).toBe(true);
    }

    await ctx.dispose();
  });

  test(`GET /api/professions handles ${CONCURRENT_REQUESTS} concurrent requests`, async () => {
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const ctx = await request.newContext({ baseURL, extraHTTPHeaders: headers });

    const requests = Array.from({ length: CONCURRENT_REQUESTS }, () => ctx.get('/api/professions'));
    const results = await Promise.all(requests.map((r) =>
      r.then(async (res) => ({ ok: res.ok(), status: res.status() })),
    ));

    const allOk = results.every((r) => r.ok);
    expect(allOk).toBe(true);

    await ctx.dispose();
  });

  test('sequential pagination requests are fast', async () => {
    const ctx = await request.newContext({
      baseURL,
      extraHTTPHeaders: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });

    const pages = [1, 2, 3];
    const timings: number[] = [];

    for (const page of pages) {
      const start = Date.now();
      const res = await ctx.get(`/api/camps?page=${page}&pageSize=10`);
      const elapsed = Date.now() - start;
      expect(res.ok()).toBeTruthy();
      timings.push(elapsed);
    }

    const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
    expect(avg).toBeLessThan(2000);

    await ctx.dispose();
  });
});

test.describe('Login rate limit', () => {
  test('sequential logins from same IP are not rate-limited', async () => {
    const attempts = 5;
    const results: number[] = [];

    for (let i = 0; i < attempts; i++) {
      const ctx = await request.newContext({ baseURL });
      const start = Date.now();
      const res = await ctx.post('/api/auth/login', {
        data: {
          username: process.env.E2E_USER ?? 'admin_master',
          password: process.env.E2E_PASS ?? 'test-password-123',
        },
      });
      results.push(res.status());
      await ctx.dispose();
    }

    const nonRateLimited = results.filter((s) => s !== 429);
    expect(nonRateLimited.length).toBeGreaterThan(0);
  });
});
