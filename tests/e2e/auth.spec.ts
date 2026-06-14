import { test, expect, request } from '@playwright/test';
import { expectError, expectEntity } from './helpers/assertions';
import { TEST } from './helpers/data';

const BASE_URL = 'http://localhost:3000';

test.describe('POST /api/auth/login', () => {
  test('returns accessToken and user on valid credentials', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const res = await ctx.post('/api/auth/login', {
      data: { username: 'e2e_auth_test', password: TEST.password },
    });
    const data = await expectEntity(res);
    expect(data).toHaveProperty('accessToken');
    expect(data).toHaveProperty('user');
    expect(data.user).toHaveProperty('username', 'e2e_auth_test');
    expect(Array.isArray(data.user.permissions)).toBe(true);
    expect(data.user.permissions.length).toBeGreaterThan(0);
    expect(typeof data.accessToken).toBe('string');
    await ctx.dispose();
  });

  test('sets refreshToken cookie', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const res = await ctx.post('/api/auth/login', {
      data: { username: 'e2e_auth_test', password: TEST.password },
    });
    const setCookie = res.headers()['set-cookie'] || '';
    expect(setCookie).toContain('refreshToken');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Path=/auth');
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

test.describe('POST /api/auth/refresh', () => {
  test('returns new accessToken with valid refresh token cookie', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const loginRes = await ctx.post('/api/auth/login', {
      data: { username: 'e2e_auth_test', password: TEST.password },
    });
    expect(loginRes.status()).toBe(200);

    const res = await ctx.post('/api/auth/refresh');
    const data = await expectEntity(res);
    expect(data).toHaveProperty('accessToken');
    expect(typeof data.accessToken).toBe('string');
    expect(data).not.toHaveProperty('refreshToken');
    await ctx.dispose();
  });

  test('returns 401 without refresh token cookie', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const res = await ctx.post('/api/auth/refresh');
    await expectError(res, 401);
    await ctx.dispose();
  });

  test('rotates refresh token on each refresh call', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const loginRes = await ctx.post('/api/auth/login', {
      data: { username: 'e2e_auth_test', password: TEST.password },
    });
    expect(loginRes.status()).toBe(200);

    // First refresh
    const first = await ctx.post('/api/auth/refresh');
    expect(first.status()).toBe(200);

    // Second refresh should also work (cookie was rotated)
    const second = await ctx.post('/api/auth/refresh');
    expect(second.status()).toBe(200);
    await ctx.dispose();
  });
});

test.describe('POST /api/auth/logout', () => {
  test('returns success and clears cookie when refresh token cookie present', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const loginRes = await ctx.post('/api/auth/login', {
      data: { username: 'e2e_auth_test', password: TEST.password },
    });
    expect(loginRes.status()).toBe(200);

    const res = await ctx.post('/api/auth/logout');
    expect(res.status()).toBe(200);

    const setCookie = res.headers()['set-cookie'] || '';
    expect(setCookie).toContain('refreshToken');
    expect(setCookie).toContain('Max-Age=0');
    await ctx.dispose();
  });

  test('returns success even without cookie', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const res = await ctx.post('/api/auth/logout');
    expect(res.status()).toBe(200);
    await ctx.dispose();
  });

  test('returns success on repeated logout', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const loginRes = await ctx.post('/api/auth/login', {
      data: { username: 'e2e_auth_test', password: TEST.password },
    });
    expect(loginRes.status()).toBe(200);

    const first = await ctx.post('/api/auth/logout');
    expect(first.status()).toBe(200);

    const second = await ctx.post('/api/auth/logout');
    expect(second.status()).toBe(200);
    await ctx.dispose();
  });

  test('refresh token is invalidated after logout', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const loginRes = await ctx.post('/api/auth/login', {
      data: { username: 'e2e_auth_test', password: TEST.password },
    });
    expect(loginRes.status()).toBe(200);

    await ctx.post('/api/auth/logout');

    const refreshRes = await ctx.post('/api/auth/refresh');
    await expectError(refreshRes, 401);
    await ctx.dispose();
  });
});
