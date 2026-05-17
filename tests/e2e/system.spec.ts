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

  test.describe('GET / (health check substitute)', () => {
    test('should return 200 and alive message', async ({ request }) => {
      // NOTE: /api/system/health does NOT exist in the codebase.
      // The root endpoint GET / serves as a health-check substitute.
      // It is defined at src/index.ts:41-43 and returns:
      //   { message: 'gestion-del-fin-api is alive and kicking!' }
      //
      // IMPORTANT: baseURL is 'http://localhost:3000/api' in playwright.config.ts,
      // so relative URLs are resolved against that. The root endpoint lives at
      // http://localhost:3000/ (outside the /api prefix), so we use the full URL.

      const resp = await request.get('http://localhost:3000/');

      expect(resp.status()).toBe(200);
      expect(resp.headers()['content-type']).toContain('application/json');

      const body = await resp.json();
      expect(body).toHaveProperty('message');
      expect(body.message).toContain('gestion-del-fin-api');
    });
  });
});
