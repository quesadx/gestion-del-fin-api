import { test, expect } from './helpers/fixtures';
import { expectError, expectDataArray, expectEntity, expectCreated } from './helpers/assertions';

let transferId: number;

test.describe('POST /api/transfers', () => {
  test('creates a resource transfer from camp 1 to camp 2', async ({ adminRequest }) => {
    const resRes = await adminRequest.get('/resources');
    const resData = await resRes.json();
    const resourceId = resData.data[0].id;

    const data = await expectCreated(
      adminRequest.post('/transfers', {
        data: {
          requesting_camp: 1,
          target_camp: 2,
          type: 'RESOURCE',
          requested_by: 1,
          notes: 'E2E resource transfer test',
          items: [{ item_type: 'RESOURCE', resource_type_id: resourceId, quantity: 5 }],
        },
      }),
    );
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('status', 'PENDING');
    transferId = data.id as number;
  });

  test('returns 400 when requesting_camp equals target_camp', async ({ adminRequest }) => {
    const res = await adminRequest.post('/transfers', {
      data: {
        requesting_camp: 1,
        target_camp: 1,
        type: 'RESOURCE',
        requested_by: 1,
        items: [{ item_type: 'RESOURCE', resource_type_id: 1, quantity: 1 }],
      },
    });
    await expectError(res, 400);
  });

  test('returns 400 when items array is empty', async ({ adminRequest }) => {
    const res = await adminRequest.post('/transfers', {
      data: {
        requesting_camp: 1,
        target_camp: 2,
        type: 'RESOURCE',
        requested_by: 1,
        items: [],
      },
    });
    await expectError(res, 400);
  });

  test('returns 400 when required fields missing', async ({ adminRequest }) => {
    const res = await adminRequest.post('/transfers', {
      data: { type: 'RESOURCE' },
    });
    await expectError(res, 400);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.post('/transfers', {
      data: {
        requesting_camp: 1,
        target_camp: 2,
        type: 'RESOURCE',
        requested_by: 1,
        items: [{ item_type: 'RESOURCE', resource_type_id: 1, quantity: 1 }],
      },
    });
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('GET /api/transfers', () => {
  test('returns list of transfers', async ({ adminRequest }) => {
    const transfers = await expectDataArray(adminRequest.get('/transfers'), 1);
    expect(transfers.length).toBeGreaterThanOrEqual(1);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.get('/transfers');
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('GET /api/transfers/:id', () => {
  test('returns transfer by id', async ({ adminRequest }) => {
    const data = await expectEntity(adminRequest.get(`/transfers/${transferId}`));
    expect(data).toHaveProperty('id', transferId);
  });

  test('returns 404 for non-existent id', async ({ adminRequest }) => {
    const res = await adminRequest.get('/transfers/99999');
    await expectError(res, 404);
  });
});

test.describe('Transfer workflow (approve → complete)', () => {
  test('full lifecycle: schedule → approve source → approve target → complete', async ({
    adminRequest,
  }) => {
    const resRes = await adminRequest.get('/resources');
    const resData = await resRes.json();
    const resourceId = resData.data[0].id;

    const create = await expectCreated(
      adminRequest.post('/transfers', {
        data: {
          requesting_camp: 1,
          target_camp: 2,
          type: 'RESOURCE',
          requested_by: 1,
          items: [{ item_type: 'RESOURCE', resource_type_id: resourceId, quantity: 3 }],
        },
      }),
    );
    const tId = create.id as number;
    expect(create).toHaveProperty('status', 'PENDING');

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const deliveryDate = futureDate.toISOString();

    const sched = await adminRequest.patch(`/transfers/${tId}/schedule`, {
      data: { scheduled_delivery_date: deliveryDate },
    });
    expect(sched.ok()).toBeTruthy();

    const appSource = await adminRequest.patch(`/transfers/${tId}/approve-source`, {
      data: { notes: 'Source approved' },
    });
    expect(appSource.ok()).toBeTruthy();

    const appTarget = await adminRequest.patch(`/transfers/${tId}/approve-target`, {
      data: { notes: 'Target approved' },
    });
    expect(appTarget.ok()).toBeTruthy();

    const complete = await adminRequest.patch(`/transfers/${tId}/complete`, {
      data: { notes: 'Delivery confirmed' },
    });
    expect(complete.ok()).toBeTruthy();
  });
});

test.describe('Transfer rejection', () => {
  test('rejects a transfer with reason', async ({ adminRequest }) => {
    const resRes = await adminRequest.get('/resources');
    const resData = await resRes.json();
    const resourceId = resData.data[0].id;

    const create = await expectCreated(
      adminRequest.post('/transfers', {
        data: {
          requesting_camp: 1,
          target_camp: 2,
          type: 'RESOURCE',
          requested_by: 1,
          items: [{ item_type: 'RESOURCE', resource_type_id: resourceId, quantity: 2 }],
        },
      }),
    );
    const tId = create.id as number;

    const reject = await adminRequest.patch(`/transfers/${tId}/reject`, {
      data: { reason: 'Insufficient resources' },
    });
    expect(reject.ok()).toBeTruthy();
  });

  test('returns 400 when reject reason is empty', async ({ adminRequest }) => {
    const res = await adminRequest.patch(`/transfers/${transferId}/reject`, {
      data: { reason: '' },
    });
    await expectError(res, 400);
  });
});
