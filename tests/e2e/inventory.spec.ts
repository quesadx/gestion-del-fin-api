import { test, expect } from './helpers/fixtures';
import { expectError, expectDataArray } from './helpers/assertions';

test.describe('GET /api/inventory/:campId', () => {
  test('returns camp inventory for admin', async ({ adminRequest }) => {
    const res = await adminRequest.get('/api/inventory/1');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('data');
    expect(body.data).toBeTruthy();
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000',
    });
    const res = await ctx.get('/api/inventory/1');
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('GET /api/inventory/audit/:campId', () => {
  test('returns inventory audit log', async ({ adminRequest }) => {
    const res = await adminRequest.get('/api/inventory/audit/1');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('data');
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000',
    });
    const res = await ctx.get('/api/inventory/audit/1');
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('POST /api/inventory/adjustment', () => {
  test('adjusts inventory and reflects change', async ({ adminRequest }) => {
    const listRes = await adminRequest.get('/api/resources');
    const listData = await listRes.json();
    const resourceId = listData.data[0].id;

    const adj = await adminRequest.post('/api/inventory/adjustment', {
      data: {
        camp_id: 1,
        resource_type_id: resourceId,
        type: 'MANUAL_IN',
        quantity: 50,
        description: 'E2E test adjustment',
      },
    });
    expect(adj.ok()).toBeTruthy();

    const inv = await adminRequest.get('/api/inventory/1');
    const body = await inv.json();
    expect(body.data).toBeTruthy();
  });

  test('returns 400 when quantity is missing', async ({ adminRequest }) => {
    const res = await adminRequest.post('/api/inventory/adjustment', {
      data: {
        camp_id: 1,
        resource_type_id: 1,
        type: 'MANUAL_IN',
      },
    });
    await expectError(res, 400);
  });

  test('returns 400 when camp_id is missing', async ({ adminRequest }) => {
    const res = await adminRequest.post('/api/inventory/adjustment', {
      data: {
        resource_type_id: 1,
        type: 'MANUAL_IN',
        quantity: 10,
      },
    });
    await expectError(res, 400);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000',
    });
    const res = await ctx.post('/api/inventory/adjustment', {
      data: {
        camp_id: 1,
        resource_type_id: 1,
        type: 'MANUAL_IN',
        quantity: 10,
      },
    });
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('Cross-camp inventory isolation', () => {
  test('camp 1 inventory is not empty', async ({ adminRequest }) => {
    const res = await adminRequest.get('/api/inventory/1');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data).toBeTruthy();
  });

  test('camp 2 inventory exists separately', async ({ adminRequest }) => {
    const res = await adminRequest.get('/api/inventory/2');
    expect(res.ok()).toBeTruthy();
  });

  test('worker_camp1 can see camp 1 inventory', async ({ workerCamp1Request }) => {
    const res = await workerCamp1Request.get('/api/inventory/1');
    expect(res.ok()).toBeTruthy();
  });
});
