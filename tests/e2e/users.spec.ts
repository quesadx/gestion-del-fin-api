import { test, expect } from './helpers/fixtures';
import { expectError, expectDataArray, expectEntity, expectCreated } from './helpers/assertions';

test.describe('GET /api/users', () => {
  test('returns list of users for admin', async ({ adminRequest }) => {
    const users = await expectDataArray(adminRequest.get('/api/users'), 1);
    expect(users.length).toBeGreaterThanOrEqual(1);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000',
    });
    const res = await ctx.get('/api/users');
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('GET /api/users/:id', () => {
  test('returns user by id', async ({ adminRequest }) => {
    const list = await adminRequest.get('/api/users');
    const listData = await list.json();
    const userId = listData.data[0].id;
    const data = await expectEntity(adminRequest.get(`/api/users/${userId}`));
    expect(data).toHaveProperty('id', userId);
    expect(data).toHaveProperty('username');
  });

  test('returns 404 for non-existent id', async ({ adminRequest }) => {
    const res = await adminRequest.get('/api/users/99999');
    await expectError(res, 404);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000',
    });
    const res = await ctx.get('/api/users/1');
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('POST /api/users', () => {
  test('creates a user and returns 201', async ({ adminRequest }) => {
    const list = await adminRequest.get('/api/roles');
    const listData = await list.json();
    const roleId = listData.data[0].id;

    const data = await expectCreated(
      adminRequest.post('/api/users', {
        data: {
          username: 'new_test_user',
          password: 'testpass123',
          camp_id: 1,
          role_id: roleId,
        },
      }),
    );
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('username', 'new_test_user');
  });

  test('returns 409 for duplicate username', async ({ adminRequest }) => {
    const list = await adminRequest.get('/api/roles');
    const listData = await list.json();
    const roleId = listData.data[0].id;

    const res = await adminRequest.post('/api/users', {
      data: {
        username: 'admin_master',
        password: 'testpass123',
        camp_id: 1,
        role_id: roleId,
      },
    });
    await expectError(res, 409);
  });

  test('returns 400 when required fields missing', async ({ adminRequest }) => {
    const res = await adminRequest.post('/api/users', {
      data: { username: 'no_passwd' },
    });
    await expectError(res, 400);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000',
    });
    const list = await ctx.get('/api/roles');
    const res = await ctx.post('/api/users', {
      data: {
        username: 'ghost_user',
        password: 'testpass',
        camp_id: 1,
        role_id: 1,
      },
    });
    await expectError(res, 401);
    await ctx.dispose();
  });

  test.skip('returns 403 when non-admin tries to create', async ({ workerCamp1Request }) => {
    const res = await workerCamp1Request.post('/api/users', {
      data: {
        username: 'rebel_user',
        password: 'testpass',
        camp_id: 1,
        role_id: 1,
      },
    });
    await expectError(res, 403);
  });
});

test.describe('PUT /api/users/:id', () => {
  test('updates user', async ({ adminRequest }) => {
    const rolesRes = await adminRequest.get('/api/roles');
    const rolesData = await rolesRes.json();
    const roleId = rolesData.data[0].id;

    const create = await expectCreated(
      adminRequest.post('/api/users', {
        data: {
          username: 'updatable_user',
          password: 'testpass123',
          camp_id: 1,
          role_id: roleId,
        },
      }),
    );
    const userId = create.id as number;
    const data = await expectEntity(
      adminRequest.put(`/api/users/${userId}`, {
        data: { is_active: false },
      }),
    );
    expect(data).toHaveProperty('is_active', false);
  });

  test('returns 404 for non-existent id', async ({ adminRequest }) => {
    const res = await adminRequest.put('/api/users/99999', {
      data: { is_active: false },
    });
    await expectError(res, 404);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000',
    });
    const res = await ctx.put('/api/users/1', { data: { is_active: false } });
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('DELETE /api/users/:id', () => {
  test('returns success on delete', async ({ adminRequest }) => {
    const rolesRes = await adminRequest.get('/api/roles');
    const rolesData = await rolesRes.json();
    const roleId = rolesData.data[0].id;

    const create = await expectCreated(
      adminRequest.post('/api/users', {
        data: {
          username: 'temp_user',
          password: 'testpass123',
          camp_id: 1,
          role_id: roleId,
        },
      }),
    );
    const tempId = create.id as number;
    const res = await adminRequest.delete(`/api/users/${tempId}`);
    expect(res.status()).toBe(204);
  });

  test('returns 404 for non-existent id', async ({ adminRequest }) => {
    const res = await adminRequest.delete('/api/users/99999');
    await expectError(res, 404);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000',
    });
    const res = await ctx.delete('/api/users/99999');
    await expectError(res, 401);
    await ctx.dispose();
  });
});
