import { test, expect } from './helpers/fixtures';
import { expectError, expectDataArray, expectEntity, expectCreated } from './helpers/assertions';

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};
const nextWeek = () => {
  const d = new Date();
  d.setDate(d.getDate() + 8);
  return d.toISOString().slice(0, 10);
};
const nextMonth = () => {
  const d = new Date();
  d.setDate(d.getDate() + 31);
  return d.toISOString().slice(0, 10);
};

let expeditionId: number;

test.describe('POST /api/expeditions', () => {
  test('creates an expedition with members and resources', async ({ adminRequest }) => {
    const peopleRes = await adminRequest.get('/camps/1/people');
    const peopleData = await peopleRes.json();
    const personId = peopleData.data[0].id;

    const resRes = await adminRequest.get('/resources');
    const resData = await resRes.json();
    const resourceId = resData.data[0].id;

    const data = await expectCreated(
      adminRequest.post('/expeditions', {
        data: {
          camp_id: 1,
          created_by: 1,
          destination: 'Abandoned Warehouse',
          departure_date: tomorrow(),
          expected_return_date: nextWeek(),
          max_return_date: nextMonth(),
          notes: 'Scavenging mission',
          members: [{ person_id: personId }],
          allocated_resources: [{ resource_type_id: resourceId, amount: 10 }],
        },
      }),
    );
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('destination', 'Abandoned Warehouse');
    expect(data).toHaveProperty('status', 'PLANNED');
    expeditionId = data.id as number;
  });

  test('returns 400 for invalid dates (departure after return)', async ({ adminRequest }) => {
    const res = await adminRequest.post('/expeditions', {
      data: {
        camp_id: 1,
        created_by: 1,
        destination: 'Bad Dates',
        departure_date: nextMonth(),
        expected_return_date: tomorrow(),
        max_return_date: nextWeek(),
      },
    });
    await expectError(res, 400);
  });

  test('returns 400 when required fields missing', async ({ adminRequest }) => {
    const res = await adminRequest.post('/expeditions', {
      data: { destination: 'Incomplete' },
    });
    await expectError(res, 400);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.post('/expeditions', {
      data: {
        camp_id: 1,
        created_by: 1,
        destination: 'Ghost',
        departure_date: tomorrow(),
        expected_return_date: nextWeek(),
        max_return_date: nextMonth(),
      },
    });
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('GET /api/expeditions', () => {
  test('returns list of expeditions', async ({ adminRequest }) => {
    const expeditions = await expectDataArray(adminRequest.get('/expeditions'), 1);
    expect(expeditions.length).toBeGreaterThanOrEqual(1);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.get('/expeditions');
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('GET /api/expeditions/:id', () => {
  test('returns expedition by id', async ({ adminRequest }) => {
    const id = expeditionId;
    const data = await expectEntity(adminRequest.get(`/expeditions/${id}`));
    expect(data).toHaveProperty('id', id);
  });

  test('returns 404 for non-existent id', async ({ adminRequest }) => {
    const res = await adminRequest.get('/expeditions/99999');
    await expectError(res, 404);
  });
});

test.describe('PATCH /api/expeditions/:id/status', () => {
  test('departs expedition (PLANNED → ONGOING)', async ({ adminRequest }) => {
    const create = await expectCreated(
      adminRequest.post('/expeditions', {
        data: {
          camp_id: 1,
          created_by: 1,
          destination: 'Status Test Mission',
          departure_date: tomorrow(),
          expected_return_date: nextWeek(),
          max_return_date: nextMonth(),
        },
      }),
    );
    const expId = create.id as number;

    const res = await adminRequest.patch(`/expeditions/${expId}/status`, {
      data: { status: 'ONGOING', changed_by: 1 },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('returns expedition (ONGOING → RETURNED)', async ({ adminRequest }) => {
    const create = await expectCreated(
      adminRequest.post('/expeditions', {
        data: {
          camp_id: 1,
          created_by: 1,
          destination: 'Return Test',
          departure_date: tomorrow(),
          expected_return_date: nextWeek(),
          max_return_date: nextMonth(),
        },
      }),
    );
    const expId = create.id as number;

    await adminRequest.patch(`/expeditions/${expId}/status`, {
      data: { status: 'ONGOING', changed_by: 1 },
    });

    const res = await adminRequest.patch(`/expeditions/${expId}/status`, {
      data: {
        status: 'RETURNED',
        changed_by: 1,
        actual_return_date: new Date().toISOString().slice(0, 10),
      },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('returns 400 when RETURNED without actual_return_date', async ({ adminRequest }) => {
    const create = await expectCreated(
      adminRequest.post('/expeditions', {
        data: {
          camp_id: 1,
          created_by: 1,
          destination: 'Bad Return',
          departure_date: tomorrow(),
          expected_return_date: nextWeek(),
          max_return_date: nextMonth(),
        },
      }),
    );
    const expId = create.id as number;

    await adminRequest.patch(`/expeditions/${expId}/status`, {
      data: { status: 'ONGOING', changed_by: 1 },
    });

    const res = await adminRequest.patch(`/expeditions/${expId}/status`, {
      data: { status: 'RETURNED', changed_by: 1 },
    });
    await expectError(res, 400);
  });
});

test.describe('DELETE /api/expeditions/:id', () => {
  test('returns success on delete', async ({ adminRequest }) => {
    const create = await expectCreated(
      adminRequest.post('/expeditions', {
        data: {
          camp_id: 1,
          created_by: 1,
          destination: 'Delete Me',
          departure_date: tomorrow(),
          expected_return_date: nextWeek(),
          max_return_date: nextMonth(),
        },
      }),
    );
    const expId = create.id as number;
    const res = await adminRequest.delete(`/expeditions/${expId}`, {
      data: { changed_by: 1 },
    });
    expect(res.ok()).toBeTruthy();
  });
});

test.describe('Camp-scoped access', () => {
  test('admin_camp2 can see different expeditions', async ({ adminCamp2Request }) => {
    const res = await adminCamp2Request.get('/expeditions');
    expect(res.ok()).toBeTruthy();
  });
});
