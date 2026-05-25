import { createClient } from 'redis';
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { enqueueDailyRations } from '../../src/jobs/job-queue';

describe('scheduler enqueue', () => {
  const url = process.env.REDIS_JOBS_URL || 'redis://localhost:6379/1';
  let client: ReturnType<typeof createClient>;

  beforeAll(async () => {
    client = createClient({ url });
    await client.connect();
    await client.del('jobs:daily_rations');
  });

  afterAll(async () => {
    if (client) await client.quit();
  });

  test('enqueueDailyRations pushes an item', async () => {
    // enqueue for a specific camp (optional)
    await enqueueDailyRations(url, 1);
    const len = await client.lLen('jobs:daily_rations');
    expect(len).toBeGreaterThanOrEqual(1);
  }, 10000);
});
