import { test, expect } from './helpers/fixtures';
import { expectError, expectDataArray, expectEntity, expectCreated } from './helpers/assertions';
import { TEST } from './helpers/data';

test.describe('GET /api/professions', () => {
  test('returns list of professions for admin', async ({ adminRequest }) => {
    const professions = await expectDataArray(adminRequest.get('/professions'), 2);
    expect(professions.length).toBeGreaterThanOrEqual(2);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.get('/professions');
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('GET /api/professions/:id', () => {
  test('returns profession by id', async ({ adminRequest }) => {
    const list = await adminRequest.get('/professions');
    const listData = await list.json();
    const profId = listData.data[0].id;

    const data = await expectEntity(adminRequest.get(`/professions/${profId}`));
    expect(data).toHaveProperty('id', profId);
    expect(data).toHaveProperty('name');
  });

  test('returns 404 for non-existent id', async ({ adminRequest }) => {
    const res = await adminRequest.get('/professions/99999');
    await expectError(res, 404);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.get('/professions/1');
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('POST /api/professions', () => {
  test('creates a profession and returns 201', async ({ adminRequest }) => {
    const data = await expectCreated(
      adminRequest.post('/professions', {
        data: { name: 'Medic', description: 'Heals and treats survivors' },
      }),
    );
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('name', 'Medic');
  });

  test('returns 409 for duplicate profession name', async ({ adminRequest }) => {
    const res = await adminRequest.post('/professions', {
      data: { name: TEST.professions.engineer },
    });
    await expectError(res, 409);
  });

  test('returns 400 when name is empty', async ({ adminRequest }) => {
    const res = await adminRequest.post('/professions', {
      data: { name: '' },
    });
    await expectError(res, 400);
  });

  test('returns 400 when name is missing', async ({ adminRequest }) => {
    const res = await adminRequest.post('/professions', {
      data: { description: 'No name' },
    });
    await expectError(res, 400);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.post('/professions', {
      data: { name: 'Ghost Profession' },
    });
    await expectError(res, 401);
    await ctx.dispose();
  });

  test('returns 403 when non-admin tries to create', async ({ workerCamp1Request }) => {
    const res = await workerCamp1Request.post('/professions', {
      data: { name: 'Rebel Profession' },
    });
    await expectError(res, 403);
  });
});

test.describe('PUT /api/professions/:id', () => {
  test('updates profession name', async ({ adminRequest }) => {
    const create = await expectCreated(
      adminRequest.post('/professions', {
        data: { name: 'Updatable Prof', description: 'Will be updated' },
      }),
    );
    const profId = create.id as number;

    const data = await expectEntity(
      adminRequest.put(`/professions/${profId}`, {
        data: { name: 'Updated Profession' },
      }),
    );
    expect(data).toHaveProperty('name', 'Updated Profession');
  });

  test('returns 404 for non-existent id', async ({ adminRequest }) => {
    const res = await adminRequest.put('/professions/99999', {
      data: { name: 'Ghost' },
    });
    await expectError(res, 404);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.put('/professions/1', {
      data: { name: 'Hack' },
    });
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('DELETE /api/professions/:id', () => {
  test('returns success on delete', async ({ adminRequest }) => {
    const create = await expectCreated(
      adminRequest.post('/professions', {
        data: { name: 'Temp Profession', description: 'Delete me' },
      }),
    );
    const tempId = create.id as number;
    const res = await adminRequest.delete(`/professions/${tempId}`);
    expect(res.status()).toBe(200);
  });

  test('returns 404 for non-existent id', async ({ adminRequest }) => {
    const res = await adminRequest.delete('/professions/99999');
    await expectError(res, 404);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.delete('/professions/99999');
    await expectError(res, 401);
    await ctx.dispose();
  });
});
