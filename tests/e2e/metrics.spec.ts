import { test, expect } from './helpers/fixtures';
import { expectError } from './helpers/assertions';

test.describe('GET /api/metrics/dashboard', () => {
  test('returns dashboard metrics', async ({ adminRequest }) => {
    const res = await adminRequest.get('/api/metrics/dashboard');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(typeof body).toBe('object');
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000',
    });
    const res = await ctx.get('/api/metrics/dashboard');
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('GET /api/metrics/resources', () => {
  test('returns resource metrics', async ({ adminRequest }) => {
    const res = await adminRequest.get('/api/metrics/resources');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000',
    });
    const res = await ctx.get('/api/metrics/resources');
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('GET /api/metrics/people', () => {
  test('returns people metrics', async ({ adminRequest }) => {
    const res = await adminRequest.get('/api/metrics/people');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(typeof body).toBe('object');
    expect(body).toHaveProperty('total_survivors');
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000',
    });
    const res = await ctx.get('/api/metrics/people');
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('GET /api/metrics/expeditions', () => {
  test('returns expedition metrics', async ({ adminRequest }) => {
    const res = await adminRequest.get('/api/metrics/expeditions');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(typeof body).toBe('object');
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000',
    });
    const res = await ctx.get('/api/metrics/expeditions');
    await expectError(res, 401);
    await ctx.dispose();
  });
});
