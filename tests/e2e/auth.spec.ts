import { test, expect, request } from '@playwright/test';
import { expectError, expectEntity } from './helpers/assertions';
import { TEST } from './helpers/data';

const BASE_URL = 'http://localhost:3000';

test.describe('POST /api/auth/login', () => {
  test('returns token and user on valid credentials', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const res = await ctx.post('/api/auth/login', {
      data: { username: 'e2e_auth_test', password: TEST.password },
    });
    const data = await expectEntity(res);
    expect(data).toHaveProperty('token');
    expect(data).toHaveProperty('user');
    expect(data.user).toHaveProperty('username', 'e2e_auth_test');
    expect(Array.isArray(data.user.permissions)).toBe(true);
    expect(data.user.permissions.length).toBeGreaterThan(0);
    expect(typeof data.token).toBe('string');
    await ctx.dispose();
  });

  test('returns 400 when username is missing', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const res = await ctx.post('/api/auth/login', {
      data: { password: TEST.password },
    });
    await expectError(res, 400);
    await ctx.dispose();
  });

  test('returns 400 when password is missing', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const res = await ctx.post('/api/auth/login', {
      data: { username: 'e2e_auth_test' },
    });
    await expectError(res, 400);
    await ctx.dispose();
  });

  test('returns 400 when body is empty', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const res = await ctx.post('/api/auth/login', { data: {} });
    await expectError(res, 400);
    await ctx.dispose();
  });

  test('returns 401 when password is wrong', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const res = await ctx.post('/api/auth/login', {
      data: { username: 'e2e_auth_test', password: 'wrong-password' },
    });
    await expectError(res, 401);
    await ctx.dispose();
  });

  test('returns 401 for non-existent user', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const res = await ctx.post('/api/auth/login', {
      data: { username: 'ghost_user_999', password: TEST.password },
    });
    await expectError(res, 401);
    await ctx.dispose();
  });

  test('returns 400 when username exceeds max length', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const res = await ctx.post('/api/auth/login', {
      data: { username: 'a'.repeat(61), password: TEST.password },
    });
    await expectError(res, 400);
    await ctx.dispose();
  });
});

test.describe('POST /api/auth/logout', () => {
  test('returns success when valid token provided', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const loginRes = await ctx.post('/api/auth/login', {
      data: { username: 'e2e_auth_test', password: TEST.password },
    });
    const loginData = await loginRes.json();
    const token = loginData.token;

    const res = await ctx.post('/api/auth/logout', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    await ctx.dispose();
  });

  test('returns 401 when no token provided', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const res = await ctx.post('/api/auth/logout');
    await expectError(res, 401);
    await ctx.dispose();
  });

  test('returns 401 when invalid token provided', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const res = await ctx.post('/api/auth/logout', {
      headers: { Authorization: 'Bearer invalid.token.here' },
    });
    await expectError(res, 401);
    await ctx.dispose();
  });

  test('returns 200 on repeated logout (auth routes skip sessionMiddleware)', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const loginRes = await ctx.post('/api/auth/login', {
      data: { username: 'e2e_auth_test', password: TEST.password },
    });
    const loginData = await loginRes.json();
    const token = loginData.token;

    const first = await ctx.post('/api/auth/logout', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(first.status()).toBe(200);

    const second = await ctx.post('/api/auth/logout', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(second.status()).toBe(200);
    await ctx.dispose();
  });
});
