import { test, expect } from '@playwright/test';

test.describe('System endpoints', () => {
  test.describe('GET /api/system/time', () => {
    test('should return 200 and server timestamp', async ({ request }) => {
      const resp = await request.get('/api/system/time');

      // Status check
      expect(resp.status()).toBe(200);

      // Content-Type check
      expect(resp.headers()['content-type']).toContain('application/json');

      // Body shape check
      const body = await resp.json();
      expect(body).toBeDefined();
      expect(typeof body).toBe('object');

      // The system.service.getServerTime() returns an object with server time data
      // Verify the response is a valid object (not an error envelope)
      expect(body).not.toHaveProperty('error');
    });

    test('should not require authentication', async ({ request }) => {
      // No Authorization header — should still succeed
      const resp = await request.get('/api/system/time');
      expect(resp.status()).toBe(200);
    });
  });

  test.describe('GET / (health check)', () => {
    test('should return 200 and alive message', async ({ request }) => {
      const resp = await request.get('/');
      expect(resp.status()).toBe(200);
      expect(resp.headers()['content-type']).toContain('application/json');

      const body = await resp.json();
      expect(body).toHaveProperty('message');
      expect(body.message).toContain('gestion-del-fin-api');
    });
  });
});
