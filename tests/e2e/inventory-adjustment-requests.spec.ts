import { test, expect } from './helpers/fixtures';
import { expectError, expectCreated } from './helpers/assertions';

test.describe('POST /api/inventory-adjustment-requests', () => {
  test('worker creates adjustment request', async ({ workerCamp1Request }) => {
    const res = await workerCamp1Request.post('/api/inventory-adjustment-requests', {
      data: {
        camp_id: 1,
        resource_type_id: 1,
        adjustment_type: 'MANUAL_IN',
        quantity: 50,
        reason: 'E2E test request',
      },
    });
    const body = await expectCreated(res);
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('status', 'PENDING');
    expect(body).toHaveProperty('adjustment_type', 'MANUAL_IN');
  });

  test('worker cannot create request for another camp', async ({ workerCamp1Request }) => {
    const res = await workerCamp1Request.post('/api/inventory-adjustment-requests', {
      data: {
        camp_id: 2,
        resource_type_id: 1,
        adjustment_type: 'MANUAL_IN',
        quantity: 50,
      },
    });
    await expectError(res, 403);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({ baseURL: 'http://localhost:3000' });
    const res = await ctx.post('/api/inventory-adjustment-requests', {
      data: {
        camp_id: 1,
        resource_type_id: 1,
        adjustment_type: 'MANUAL_IN',
        quantity: 10,
      },
    });
    await expectError(res, 401);
    await ctx.dispose();
  });

  test('returns 400 when quantity is missing', async ({ workerCamp1Request }) => {
    const res = await workerCamp1Request.post('/api/inventory-adjustment-requests', {
      data: {
        camp_id: 1,
        resource_type_id: 1,
        adjustment_type: 'MANUAL_IN',
      },
    });
    await expectError(res, 400);
  });
});

test.describe('GET /api/inventory-adjustment-requests/my', () => {
  test('worker views own requests', async ({ workerCamp1Request }) => {
    const res = await workerCamp1Request.get('/api/inventory-adjustment-requests/my');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({ baseURL: 'http://localhost:3000' });
    const res = await ctx.get('/api/inventory-adjustment-requests/my');
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('GET /api/inventory-adjustment-requests', () => {
  test('resource manager views all requests', async ({ resourceMgrRequest }) => {
    const res = await resourceMgrRequest.get('/api/inventory-adjustment-requests');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('worker cannot view all requests', async ({ workerCamp1Request }) => {
    const res = await workerCamp1Request.get('/api/inventory-adjustment-requests');
    await expectError(res, 403);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({ baseURL: 'http://localhost:3000' });
    const res = await ctx.get('/api/inventory-adjustment-requests');
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('PATCH /api/inventory-adjustment-requests/:id/approve', () => {
  test('resource manager approves a pending request', async ({
    workerCamp1Request,
    resourceMgrRequest,
  }) => {
    const createRes = await workerCamp1Request.post('/api/inventory-adjustment-requests', {
      data: {
        camp_id: 1,
        resource_type_id: 1,
        adjustment_type: 'MANUAL_IN',
        quantity: 10,
        reason: 'Approve E2E test',
      },
    });
    const created = await createRes.json();
    expect(created.status).toBe('PENDING');

    const approveRes = await resourceMgrRequest.patch(
      `/api/inventory-adjustment-requests/${created.id}/approve`,
    );
    expect(approveRes.ok()).toBeTruthy();
    const body = await approveRes.json();
    expect(body.request.status).toBe('APPROVED');
  });

  test('worker cannot approve requests', async ({ workerCamp1Request }) => {
    const res = await workerCamp1Request.patch('/api/inventory-adjustment-requests/1/approve');
    await expectError(res, 403);
  });

  test('returns 404 for nonexistent request', async ({ resourceMgrRequest }) => {
    const res = await resourceMgrRequest.patch('/api/inventory-adjustment-requests/99999/approve');
    await expectError(res, 404);
  });
});

test.describe('PATCH /api/inventory-adjustment-requests/:id/reject', () => {
  test('resource manager rejects a pending request', async ({
    workerCamp1Request,
    resourceMgrRequest,
  }) => {
    const createRes = await workerCamp1Request.post('/api/inventory-adjustment-requests', {
      data: {
        camp_id: 1,
        resource_type_id: 1,
        adjustment_type: 'MANUAL_IN',
        quantity: 10,
        reason: 'Reject E2E test',
      },
    });
    const created = await createRes.json();
    expect(created.status).toBe('PENDING');

    const rejectRes = await resourceMgrRequest.patch(
      `/api/inventory-adjustment-requests/${created.id}/reject`,
    );
    expect(rejectRes.ok()).toBeTruthy();
    const body = await rejectRes.json();
    expect(body.request.status).toBe('REJECTED');
  });

  test('worker cannot reject requests', async ({ workerCamp1Request }) => {
    const res = await workerCamp1Request.patch('/api/inventory-adjustment-requests/1/reject');
    await expectError(res, 403);
  });

  test('returns 400 when rejecting already processed request', async ({
    workerCamp1Request,
    resourceMgrRequest,
  }) => {
    const createRes = await workerCamp1Request.post('/api/inventory-adjustment-requests', {
      data: {
        camp_id: 1,
        resource_type_id: 1,
        adjustment_type: 'MANUAL_IN',
        quantity: 10,
        reason: 'Double reject E2E test',
      },
    });
    const created = await createRes.json();

    await resourceMgrRequest.patch(`/api/inventory-adjustment-requests/${created.id}/reject`);
    const res = await resourceMgrRequest.patch(
      `/api/inventory-adjustment-requests/${created.id}/reject`,
    );
    await expectError(res, 400);
  });
});
