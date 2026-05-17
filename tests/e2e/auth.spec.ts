import { test, expect, request } from '@playwright/test';
import { expectError, expectEntity } from './helpers/assertions';
import { TEST } from './helpers/data';

const BASE_URL = 'http://localhost:3000/api';

test.describe('POST /api/auth/login', () => {
  test('returns token and user on valid credentials', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const res = await ctx.post('/auth/login', {
      data: { username: 'admin_master', password: TEST.password },
    });
    const data = await expectEntity(res);
    expect(data).toHaveProperty('token');
    expect(data).toHaveProperty('user');
    expect(data.user).toHaveProperty('id');
    expect(data.user).toHaveProperty('username', 'admin_master');
    expect(typeof data.token).toBe('string');
    await ctx.dispose();
  });

  test('returns 400 when username is missing', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const res = await ctx.post('/auth/login', {
      data: { password: TEST.password },
    });
    await expectError(res, 400);
    await ctx.dispose();
  });

  test('returns 400 when password is missing', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const res = await ctx.post('/auth/login', {
      data: { username: 'admin_master' },
    });
    await expectError(res, 400);
    await ctx.dispose();
  });

  test('returns 400 when body is empty', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const res = await ctx.post('/auth/login', { data: {} });
    await expectError(res, 400);
    await ctx.dispose();
  });

  test('returns 401 when password is wrong', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const res = await ctx.post('/auth/login', {
      data: { username: 'admin_master', password: 'wrong-password' },
    });
    await expectError(res, 401);
    await ctx.dispose();
  });

  test('returns 401 for non-existent user', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const res = await ctx.post('/auth/login', {
      data: { username: 'ghost_user_999', password: TEST.password },
    });
    await expectError(res, 401);
    await ctx.dispose();
  });

  test('returns 400 when username exceeds max length', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const res = await ctx.post('/auth/login', {
      data: { username: 'a'.repeat(61), password: TEST.password },
    });
    await expectError(res, 400);
    await ctx.dispose();
  });
});

test.describe('POST /api/auth/logout', () => {
  test('returns success when valid token provided', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const loginRes = await ctx.post('/auth/login', {
      data: { username: 'admin_master', password: TEST.password },
    });
    const loginData = await loginRes.json();
    const token = loginData.data.token;

    const res = await ctx.post('/auth/logout', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    await ctx.dispose();
  });

  test('returns 401 when no token provided', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const res = await ctx.post('/auth/logout');
    await expectError(res, 401);
    await ctx.dispose();
  });

  test('returns 401 when invalid token provided', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const res = await ctx.post('/auth/logout', {
      headers: { Authorization: 'Bearer invalid.token.here' },
    });
    await expectError(res, 401);
    await ctx.dispose();
  });

  test('returns 401 when already logged out (session invalidated)', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const loginRes = await ctx.post('/auth/login', {
      data: { username: 'admin_master', password: TEST.password },
    });
    const loginData = await loginRes.json();
    const token = loginData.data.token;

    await ctx.post('/auth/logout', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const res = await ctx.post('/auth/logout', {
      headers: { Authorization: `Bearer ${token}` },
    });
    await expectError(res, 401);
    await ctx.dispose();
  });
});
