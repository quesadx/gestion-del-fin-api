import { test, expect } from './helpers/fixtures';
import { expectError, expectDataArray, expectEntity, expectCreated } from './helpers/assertions';
import { TEST } from './helpers/data';

test.describe('GET /api/resources', () => {
  test('returns list of resources for admin', async ({ adminRequest }) => {
    const resources = await expectDataArray(adminRequest.get('/api/resources'), 3);
    expect(resources.length).toBeGreaterThanOrEqual(3);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000',
    });
    const res = await ctx.get('/api/resources');
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('GET /api/resources/:id', () => {
  test('returns resource by id', async ({ adminRequest }) => {
    const list = await adminRequest.get('/api/resources');
    const listData = await list.json();
    const resourceId = listData.data[0].id;

    const data = await expectEntity(adminRequest.get(`/api/resources/${resourceId}`));
    expect(data).toHaveProperty('id', resourceId);
    expect(data).toHaveProperty('name');
    expect(data).toHaveProperty('unit');
  });

  test('returns 404 for non-existent id', async ({ adminRequest }) => {
    const res = await adminRequest.get('/api/resources/99999');
    await expectError(res, 404);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000',
    });
    const res = await ctx.get('/api/resources/1');
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('POST /api/resources', () => {
  test('creates a resource and returns 201', async ({ adminRequest }) => {
    const data = await expectCreated(
      adminRequest.post('/api/resources', {
        data: {
          name: 'Bandages',
          unit: 'Rolls',
          daily_ration: 0.1,
          minimum_stock: 50,
        },
      }),
    );
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('name', 'Bandages');
    expect(data).toHaveProperty('unit', 'Rolls');
  });

  test('returns 409 for duplicate resource name', async ({ adminRequest }) => {
    const res = await adminRequest.post('/api/resources', {
      data: {
        name: TEST.resources.rations.name,
        unit: 'kg',
        daily_ration: 0.5,
        minimum_stock: 100,
      },
    });
    await expectError(res, 409);
  });

  test('returns 400 when name is missing', async ({ adminRequest }) => {
    const res = await adminRequest.post('/api/resources', {
      data: { unit: 'kg', daily_ration: 0.5, minimum_stock: 100 },
    });
    await expectError(res, 400);
  });

  test('returns 400 when unit is missing', async ({ adminRequest }) => {
    const res = await adminRequest.post('/api/resources', {
      data: { name: 'No Unit', daily_ration: 0.5, minimum_stock: 100 },
    });
    await expectError(res, 400);
  });

  test('returns 400 when daily_ration is missing', async ({ adminRequest }) => {
    const res = await adminRequest.post('/api/resources', {
      data: { name: 'No Ration', unit: 'kg', minimum_stock: 100 },
    });
    await expectError(res, 400);
  });

  test('returns 400 when minimum_stock is missing', async ({ adminRequest }) => {
    const res = await adminRequest.post('/api/resources', {
      data: { name: 'No Min', unit: 'kg', daily_ration: 0.5 },
    });
    await expectError(res, 400);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000',
    });
    const res = await ctx.post('/api/resources', {
      data: {
        name: 'Ghost Resource',
        unit: 'kg',
        daily_ration: 0.5,
        minimum_stock: 100,
      },
    });
    await expectError(res, 401);
    await ctx.dispose();
  });

  test.skip('returns 403 when non-admin tries to create', async ({ workerCamp1Request }) => {
    const res = await workerCamp1Request.post('/api/resources', {
      data: {
        name: 'Rebel Resource',
        unit: 'kg',
        daily_ration: 0.5,
        minimum_stock: 100,
      },
    });
    await expectError(res, 403);
  });
});

test.describe('PUT /api/resources/:id', () => {
  test('updates resource name', async ({ adminRequest }) => {
    const create = await expectCreated(
      adminRequest.post('/api/resources', {
        data: {
          name: 'Updatable Resource',
          unit: 'Packs',
          daily_ration: 1,
          minimum_stock: 10,
        },
      }),
    );
    const resourceId = create.id as number;

    const data = await expectEntity(
      adminRequest.put(`/api/resources/${resourceId}`, {
        data: { name: 'Updated Resource' },
      }),
    );
    expect(data).toHaveProperty('name', 'Updated Resource');
  });

  test('returns 404 for non-existent id', async ({ adminRequest }) => {
    const res = await adminRequest.put('/api/resources/99999', {
      data: { name: 'Ghost' },
    });
    await expectError(res, 404);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000',
    });
    const res = await ctx.put('/api/resources/1', {
      data: { name: 'Hack' },
    });
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('DELETE /api/resources/:id', () => {
  test('returns success on delete', async ({ adminRequest }) => {
    const create = await expectCreated(
      adminRequest.post('/api/resources', {
        data: {
          name: 'Temp Resource',
          unit: 'Units',
          daily_ration: 0.1,
          minimum_stock: 1,
        },
      }),
    );
    const tempId = create.id as number;
    const res = await adminRequest.delete(`/api/resources/${tempId}`);
    expect(res.status()).toBe(204);
  });

  test('returns 404 for non-existent id', async ({ adminRequest }) => {
    const res = await adminRequest.delete('/api/resources/99999');
    await expectError(res, 404);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000',
    });
    const res = await ctx.delete('/api/resources/99999');
    await expectError(res, 401);
    await ctx.dispose();
  });
});
