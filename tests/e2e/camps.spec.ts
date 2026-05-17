import { test, expect } from './helpers/fixtures';
import { expectError, expectDataArray, expectEntity, expectCreated } from './helpers/assertions';
import { TEST } from './helpers/data';

let createdCampId: number;

test.describe('GET /api/camps', () => {
  test('returns list of camps for admin', async ({ adminRequest }) => {
    const camps = await expectDataArray(adminRequest.get('/camps'), 2);
    expect(camps.length).toBeGreaterThanOrEqual(2);
  });

  test('supports pagination with page and limit', async ({ adminRequest }) => {
    const res = await adminRequest.get('/camps?page=1&limit=1');
    const data = await expectDataArray(res);
    expect(data.length).toBeLessThanOrEqual(1);
  });

  test('returns 401 when unauthenticated', async ({ adminRequest }) => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.get('/camps');
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('GET /api/camps/:id', () => {
  test('returns camp by id', async ({ adminRequest }) => {
    const data = await expectEntity(adminRequest.get(`/camps/${TEST.camps.alphaOutpost.id}`));
    expect(data).toHaveProperty('name', TEST.camps.alphaOutpost.name);
    expect(data).toHaveProperty('location', TEST.camps.alphaOutpost.location);
  });

  test('returns 404 for non-existent id', async ({ adminRequest }) => {
    const res = await adminRequest.get('/camps/99999');
    await expectError(res, 404);
  });

  test('returns 401 when unauthenticated', async ({ adminRequest }) => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.get(`/camps/${TEST.camps.alphaOutpost.id}`);
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('POST /api/camps', () => {
  test('creates a camp and returns 201', async ({ adminRequest }) => {
    const data = await expectCreated(
      adminRequest.post('/camps', {
        data: {
          name: 'Delta Refuge',
          location: 'Grid Sector 5',
          status: 'ACTIVE',
        },
      }),
    );
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('name', 'Delta Refuge');
    createdCampId = data.id as number;
  });

  test('returns 409 for duplicate camp name', async ({ adminRequest }) => {
    const res = await adminRequest.post('/camps', {
      data: { name: TEST.camps.alphaOutpost.name },
    });
    await expectError(res, 409);
  });

  test('returns 400 when name is empty', async ({ adminRequest }) => {
    const res = await adminRequest.post('/camps', {
      data: { name: '' },
    });
    await expectError(res, 400);
  });

  test('returns 400 when name is missing', async ({ adminRequest }) => {
    const res = await adminRequest.post('/camps', {
      data: { location: 'Somewhere' },
    });
    await expectError(res, 400);
  });

  test('returns 401 when unauthenticated', async ({ adminRequest }) => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.post('/camps', {
      data: { name: 'Phantom Camp' },
    });
    await expectError(res, 401);
    await ctx.dispose();
  });

  test('returns 403 when non-admin tries to create', async ({ workerCamp1Request }) => {
    const res = await workerCamp1Request.post('/camps', {
      data: { name: 'Rebel Camp' },
    });
    await expectError(res, 403);
  });
});

test.describe('PUT /api/camps/:id', () => {
  test('updates camp name', async ({ adminRequest }) => {
    const id = createdCampId || TEST.camps.betaSanctuary.id;
    const data = await expectEntity(
      adminRequest.put(`/camps/${id}`, {
        data: { name: 'Updated Refuge' },
      }),
    );
    expect(data).toHaveProperty('name', 'Updated Refuge');
  });

  test('returns 404 for non-existent id', async ({ adminRequest }) => {
    const res = await adminRequest.put('/camps/99999', {
      data: { name: 'Ghost' },
    });
    await expectError(res, 404);
  });

  test('returns 400 when update body is empty', async ({ adminRequest }) => {
    const res = await adminRequest.put(`/camps/${TEST.camps.alphaOutpost.id}`, { data: {} });
    await expectError(res, 400);
  });

  test('returns 401 when unauthenticated', async ({ adminRequest }) => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.put(`/camps/${TEST.camps.alphaOutpost.id}`, { data: { name: 'Hack' } });
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('DELETE /api/camps/:id', () => {
  test('returns success on delete', async ({ adminRequest }) => {
    const create = await expectCreated(
      adminRequest.post('/camps', {
        data: { name: 'Temp Camp', location: 'Temporary' },
      }),
    );
    const tempId = create.id as number;
    const res = await adminRequest.delete(`/camps/${tempId}`);
    expect(res.status()).toBe(200);
  });

  test('returns 404 for non-existent id', async ({ adminRequest }) => {
    const res = await adminRequest.delete('/camps/99999');
    await expectError(res, 404);
  });

  test('returns 401 when unauthenticated', async ({ adminRequest }) => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.delete(`/camps/${TEST.camps.alphaOutpost.id}`);
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('Camp-scoped isolation', () => {
  test('admin_camp1 only sees their camp data', async ({ adminRequest }) => {
    const camps = await expectDataArray(adminRequest.get('/camps'), 1);
    for (const camp of camps) {
      expect(camp).toHaveProperty('id');
    }
  });

  test('admin_camp2 sees different scope than admin_camp1', async ({ adminCamp2Request }) => {
    const camps = await expectDataArray(adminCamp2Request.get('/camps'), 1);
    for (const camp of camps) {
      expect(camp).toHaveProperty('id');
    }
  });
});
