import { test, expect } from './helpers/fixtures';
import { expectError, expectDataArray, expectEntity, expectCreated } from './helpers/assertions';

test.describe('GET /api/permissions', () => {
  test('returns list of permissions for admin', async ({ adminRequest }) => {
    const perms = await expectDataArray(adminRequest.get('/permissions'), 1);
    expect(perms.length).toBeGreaterThanOrEqual(1);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.get('/permissions');
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('GET /api/permissions/:id', () => {
  test('returns permission by id', async ({ adminRequest }) => {
    const list = await adminRequest.get('/permissions');
    const listData = await list.json();
    const permId = listData.data[0].id;
    const data = await expectEntity(adminRequest.get(`/permissions/${permId}`));
    expect(data).toHaveProperty('id', permId);
    expect(data).toHaveProperty('name');
  });

  test('returns 404 for non-existent id', async ({ adminRequest }) => {
    const res = await adminRequest.get('/permissions/99999');
    await expectError(res, 404);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.get('/permissions/1');
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('POST /api/permissions', () => {
  test('creates a permission and returns 201', async ({ adminRequest }) => {
    const data = await expectCreated(
      adminRequest.post('/permissions', {
        data: { name: 'test.permission_demo', description: 'Test permission' },
      }),
    );
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('name', 'test.permission_demo');
  });

  test('returns 409 for duplicate permission name', async ({ adminRequest }) => {
    const list = await adminRequest.get('/permissions');
    const listData = await list.json();
    const existingName = listData.data[0].name;
    const res = await adminRequest.post('/permissions', {
      data: { name: existingName },
    });
    await expectError(res, 409);
  });

  test('returns 400 when name is empty', async ({ adminRequest }) => {
    const res = await adminRequest.post('/permissions', {
      data: { name: '' },
    });
    await expectError(res, 400);
  });

  test('returns 400 when name is missing', async ({ adminRequest }) => {
    const res = await adminRequest.post('/permissions', {
      data: { description: 'No name' },
    });
    await expectError(res, 400);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.post('/permissions', {
      data: { name: 'ghost.perm_test' },
    });
    await expectError(res, 401);
    await ctx.dispose();
  });

  test('returns 403 when non-admin tries to create', async ({ workerCamp1Request }) => {
    const res = await workerCamp1Request.post('/permissions', {
      data: { name: 'rebel.perm_test' },
    });
    await expectError(res, 403);
  });
});

test.describe('PUT /api/permissions/:id', () => {
  test('updates permission description', async ({ adminRequest }) => {
    const create = await expectCreated(
      adminRequest.post('/permissions', {
        data: {
          name: 'update.test_perm',
          description: 'Original',
        },
      }),
    );
    const permId = create.id as number;
    const data = await expectEntity(
      adminRequest.put(`/permissions/${permId}`, {
        data: { description: 'Updated description' },
      }),
    );
    expect(data).toHaveProperty('description', 'Updated description');
  });

  test('returns 404 for non-existent id', async ({ adminRequest }) => {
    const res = await adminRequest.put('/permissions/99999', {
      data: { name: 'ghost.perm' },
    });
    await expectError(res, 404);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.put('/permissions/1', {
      data: { description: 'Hack' },
    });
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('DELETE /api/permissions/:id', () => {
  test('returns success on delete', async ({ adminRequest }) => {
    const create = await expectCreated(
      adminRequest.post('/permissions', {
        data: { name: 'temp.delete_test' },
      }),
    );
    const tempId = create.id as number;
    const res = await adminRequest.delete(`/permissions/${tempId}`);
    expect(res.status()).toBe(200);
  });

  test('returns 404 for non-existent id', async ({ adminRequest }) => {
    const res = await adminRequest.delete('/permissions/99999');
    await expectError(res, 404);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.delete('/permissions/99999');
    await expectError(res, 401);
    await ctx.dispose();
  });
});
