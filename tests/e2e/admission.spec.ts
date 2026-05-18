import { test, expect } from './helpers/fixtures';
import { expectError, expectDataArray, expectEntity, expectCreated } from './helpers/assertions';

let admissionId: number;

test.describe('POST /api/admission/camps/:campId', () => {
  test('creates admission and returns AI evaluation', async ({ adminRequest }) => {
    const data = await expectCreated(
      adminRequest.post('/api/admission/camps/1', {
        data: {
          applicant_name: 'Test Refugee',
          applicant_age: 28,
          applicant_skills: 'First aid, navigation',
          health_notes: 'Healthy',
          background_notes: 'Former medic',
        },
      }),
    );
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('applicant_name', 'Test Refugee');
    admissionId = data.id as number;
  });

  test('returns 400 when applicant_name is missing', async ({ adminRequest }) => {
    const res = await adminRequest.post('/api/admission/camps/1', {
      data: { applicant_age: 30 },
    });
    await expectError(res, 400);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000',
    });
    const res = await ctx.post('/api/admission/camps/1', {
      data: { applicant_name: 'Ghost' },
    });
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('GET /api/admission/camps/:campId', () => {
  test('returns list of admissions for a camp', async ({ adminRequest }) => {
    const admissions = await expectDataArray(adminRequest.get('/api/admission/camps/1'), 1);
    expect(admissions.length).toBeGreaterThanOrEqual(1);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000',
    });
    const res = await ctx.get('/api/admission/camps/1');
    await expectError(res, 401);
    await ctx.dispose();
  });
});

test.describe('GET /api/admission/:id', () => {
  test('returns admission by id', async ({ adminRequest }) => {
    const data = await expectEntity(adminRequest.get(`/api/admission/${admissionId}`));
    expect(data).toHaveProperty('id', admissionId);
    expect(data).toHaveProperty('applicant_name');
  });

  test('returns 404 for non-existent id', async ({ adminRequest }) => {
    const res = await adminRequest.get('/api/admission/99999');
    await expectError(res, 404);
  });
});

test.describe('PATCH /api/admission/:id/review', () => {
  test('overrides AI decision with manual review (ACCEPTED)', async ({ adminRequest }) => {
    const res = await adminRequest.patch(`/api/admission/${admissionId}/review`, {
      data: { final_decision: 'ACCEPTED' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('final_decision', 'ACCEPTED');
  });

  test('overrides AI decision with REJECTED', async ({ adminRequest }) => {
    const create = await expectCreated(
      adminRequest.post('/api/admission/camps/1', {
        data: { applicant_name: 'Rejected Refugee' },
      }),
    );
    const id = create.id as number;

    const res = await adminRequest.patch(`/api/admission/${id}/review`, {
      data: { final_decision: 'REJECTED' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('final_decision', 'REJECTED');
  });

  test('returns 400 for invalid final_decision', async ({ adminRequest }) => {
    const res = await adminRequest.patch(`/api/admission/${admissionId}/review`, {
      data: { final_decision: 'MAYBE' },
    });
    await expectError(res, 400);
  });

  test('returns 401 when unauthenticated', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext({
      baseURL: 'http://localhost:3000',
    });
    const res = await ctx.patch(`/api/admission/${admissionId}/review`, {
      data: { final_decision: 'ACCEPTED' },
    });
    await expectError(res, 401);
    await ctx.dispose();
  });
});
