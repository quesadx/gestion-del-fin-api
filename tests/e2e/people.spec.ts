import { test, expect } from './helpers/fixtures';
import { expectError, expectDataArray, expectEntity, expectCreated } from './helpers/assertions';

test.describe('GET /api/camps/:campId/people', () => {
  test('returns list of people in camp', async ({ adminRequest }) => {
    const people = await expectDataArray(adminRequest.get('/camps/1/people'), 2);
    expect(people.length).toBeGreaterThanOrEqual(2);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.get('/camps/1/people');
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('GET /api/camps/:campId/people/:id', () => {
  test('returns person by id', async ({ adminRequest }) => {
    const list = await adminRequest.get('/camps/1/people');
    const listData = await list.json();
    const personId = listData.data[0].id;
    const data = await expectEntity(adminRequest.get(`/camps/1/people/${personId}`));
    expect(data).toHaveProperty('id', personId);
    expect(data).toHaveProperty('full_name');
  });

  test('returns 404 for non-existent id', async ({ adminRequest }) => {
    const res = await adminRequest.get('/camps/1/people/99999');
    await expectError(res, 404);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.get('/camps/1/people/1');
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('POST /api/camps/:campId/people', () => {
  test('creates a person and returns 201', async ({ adminRequest }) => {
    const profRes = await adminRequest.get('/professions');
    const profData = await profRes.json();
    const professionId = profData.data[0].id;

    const data = await expectCreated(
      adminRequest.post('/camps/1/people', {
        data: {
          full_name: 'John Doe',
          camp_id: 1,
          profession_id: professionId,
          admitted_at: new Date().toISOString(),
        },
      }),
    );
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('full_name', 'John Doe');
  });

  test('returns 400 when camp_id in body does not match URL', async ({ adminRequest }) => {
    const profRes = await adminRequest.get('/professions');
    const profData = await profRes.json();
    const professionId = profData.data[0].id;

    const res = await adminRequest.post('/camps/1/people', {
      data: {
        full_name: 'Wrong Camp Person',
        camp_id: 2,
        profession_id: professionId,
        admitted_at: new Date().toISOString(),
      },
    });
    await expectError(res, 400);
  });

  test('returns 400 when required fields missing', async ({ adminRequest }) => {
    const res = await adminRequest.post('/camps/1/people', {
      data: { full_name: 'Missing Fields' },
    });
    await expectError(res, 400);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.post('/camps/1/people', {
      data: {
        full_name: 'Ghost',
        camp_id: 1,
        profession_id: 1,
        admitted_at: new Date().toISOString(),
      },
    });
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('PUT /api/camps/:campId/people/:id', () => {
  test('updates person', async ({ adminRequest }) => {
    const profRes = await adminRequest.get('/professions');
    const profData = await profRes.json();
    const professionId = profData.data[0].id;

    const create = await expectCreated(
      adminRequest.post('/camps/1/people', {
        data: {
          full_name: 'Updatable Person',
          camp_id: 1,
          profession_id: professionId,
          admitted_at: new Date().toISOString(),
        },
      }),
    );
    const personId = create.id as number;
    const data = await expectEntity(
      adminRequest.put(`/camps/1/people/${personId}`, {
        data: { full_name: 'Updated Person' },
      }),
    );
    expect(data).toHaveProperty('full_name', 'Updated Person');
  });

  test('returns 404 for non-existent id', async ({ adminRequest }) => {
    const res = await adminRequest.put('/camps/1/people/99999', {
      data: { full_name: 'Ghost' },
    });
    await expectError(res, 404);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.put('/camps/1/people/1', {
      data: { full_name: 'Hack' },
    });
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('DELETE /api/camps/:campId/people/:id', () => {
  test('returns success on delete', async ({ adminRequest }) => {
    const profRes = await adminRequest.get('/professions');
    const profData = await profRes.json();
    const professionId = profData.data[0].id;

    const create = await expectCreated(
      adminRequest.post('/camps/1/people', {
        data: {
          full_name: 'Temp Person',
          camp_id: 1,
          profession_id: professionId,
          admitted_at: new Date().toISOString(),
        },
      }),
    );
    const tempId = create.id as number;
    const res = await adminRequest.delete(`/camps/1/people/${tempId}`);
    expect(res.status()).toBe(200);
  });

  test('returns 404 for non-existent id', async ({ adminRequest }) => {
    const res = await adminRequest.delete('/camps/1/people/99999');
    await expectError(res, 404);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000/api',
    });
    const res = await ctx.delete('/camps/1/people/99999');
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('Cross-camp isolation', () => {
  test('person created in camp 1 is not visible in camp 2', async ({ adminRequest }) => {
    const profRes = await adminRequest.get('/professions');
    const profData = await profRes.json();
    const professionId = profData.data[0].id;

    const create = await expectCreated(
      adminRequest.post('/camps/1/people', {
        data: {
          full_name: 'Camp1 Exclusive',
          camp_id: 1,
          profession_id: professionId,
          admitted_at: new Date().toISOString(),
        },
      }),
    );
    const personId = create.id as number;

    const res = await adminRequest.get(`/camps/2/people/${personId}`);
    await expectError(res, 404);
  });

  test('worker_camp1 can see camp 1 people', async ({ workerCamp1Request }) => {
    const people = await expectDataArray(workerCamp1Request.get('/camps/1/people'), 1);
    expect(people.length).toBeGreaterThanOrEqual(1);
  });
});
