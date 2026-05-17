import { test, expect } from './helpers/fixtures';
import { expectError } from './helpers/assertions';

test.describe('GET /api/metrics/dashboard', () => {
  test('returns dashboard metrics', async ({ adminRequest }) => {
    const res = await adminRequest.get('/metrics/dashboard');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('data');
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.get('/metrics/dashboard');
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('GET /api/metrics/resources', () => {
  test('returns resource metrics', async ({ adminRequest }) => {
    const res = await adminRequest.get('/metrics/resources');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('data');
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.get('/metrics/resources');
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('GET /api/metrics/people', () => {
  test('returns people metrics', async ({ adminRequest }) => {
    const res = await adminRequest.get('/metrics/people');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('data');
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.get('/metrics/people');
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('GET /api/metrics/expeditions', () => {
  test('returns expedition metrics', async ({ adminRequest }) => {
    const res = await adminRequest.get('/metrics/expeditions');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('data');
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.get('/metrics/expeditions');
    await expectError(res, 401);
    await ctx.dispose();
  });
});
