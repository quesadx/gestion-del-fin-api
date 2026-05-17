import { test, expect } from './helpers/fixtures';
import { expectError, expectDataArray, expectEntity, expectCreated } from './helpers/assertions';

test.describe('GET /api/roles', () => {
  test('returns list of roles for admin', async ({ adminRequest }) => {
    const roles = await expectDataArray(adminRequest.get('/roles'), 4);
    expect(roles.length).toBeGreaterThanOrEqual(4);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.get('/roles');
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('GET /api/roles/:id', () => {
  test('returns role by id', async ({ adminRequest }) => {
    const list = await adminRequest.get('/roles');
    const listData = await list.json();
    const roleId = listData.data[0].id;
    const data = await expectEntity(adminRequest.get(`/roles/${roleId}`));
    expect(data).toHaveProperty('id', roleId);
    expect(data).toHaveProperty('name');
  });

  test('returns 404 for non-existent id', async ({ adminRequest }) => {
    const res = await adminRequest.get('/roles/99999');
    await expectError(res, 404);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.get('/roles/1');
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('POST /api/roles', () => {
  test('creates a role and returns 201', async ({ adminRequest }) => {
    const data = await expectCreated(
      adminRequest.post('/roles', {
        data: { name: 'scavenger', description: 'Resource gatherer' },
      }),
    );
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('name', 'scavenger');
  });

  test('returns 409 for duplicate role name', async ({ adminRequest }) => {
    const res = await adminRequest.post('/roles', {
      data: { name: 'system_admin' },
    });
    await expectError(res, 409);
  });

  test('returns 400 when name is empty', async ({ adminRequest }) => {
    const res = await adminRequest.post('/roles', {
      data: { name: '' },
    });
    await expectError(res, 400);
  });

  test('returns 400 when name is missing', async ({ adminRequest }) => {
    const res = await adminRequest.post('/roles', {
      data: { description: 'No name' },
    });
    await expectError(res, 400);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.post('/roles', {
      data: { name: 'ghost_role' },
    });
    await expectError(res, 401);
    await ctx.dispose();
  });

  test('returns 403 when non-admin tries to create', async ({ workerCamp1Request }) => {
    const res = await workerCamp1Request.post('/roles', {
      data: { name: 'rebel_role' },
    });
    await expectError(res, 403);
  });
});

test.describe('PUT /api/roles/:id', () => {
  test('updates role description', async ({ adminRequest }) => {
    const create = await expectCreated(
      adminRequest.post('/roles', {
        data: { name: 'updatable_role', description: 'Original desc' },
      }),
    );
    const roleId = create.id as number;
    const data = await expectEntity(
      adminRequest.put(`/roles/${roleId}`, {
        data: { description: 'Updated description' },
      }),
    );
    expect(data).toHaveProperty('description', 'Updated description');
  });

  test('returns 404 for non-existent id', async ({ adminRequest }) => {
    const res = await adminRequest.put('/roles/99999', {
      data: { name: 'ghost' },
    });
    await expectError(res, 404);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.put('/roles/1', { data: { name: 'hack' } });
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('DELETE /api/roles/:id', () => {
  test('returns success on delete', async ({ adminRequest }) => {
    const create = await expectCreated(
      adminRequest.post('/roles', {
        data: { name: 'temp_role', description: 'Delete me' },
      }),
    );
    const tempId = create.id as number;
    const res = await adminRequest.delete(`/roles/${tempId}`);
    expect(res.status()).toBe(200);
  });

  test('returns 404 for non-existent id', async ({ adminRequest }) => {
    const res = await adminRequest.delete('/roles/99999');
    await expectError(res, 404);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.delete('/roles/99999');
    await expectError(res, 401);
    await ctx.dispose();
  });
});
