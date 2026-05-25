import { createClient } from 'redis';
import { afterAll, beforeAll, describe, expect, jest, test } from '@jest/globals';
import { closeJobQueueRedisClient, enqueueDailyRations } from '../../src/jobs/job-queue';

type MockRedisClient = {
  isOpen: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  quit: () => Promise<void>;
  on: () => void;
  del: (key: string) => Promise<number>;
  rPush: (key: string, value: string) => Promise<number>;
  lLen: (key: string) => Promise<number>;
  lRange: (key: string, start: number, end: number) => Promise<string[]>;
};

const redisStore = new Map<string, string[]>();

function createMockClient(): MockRedisClient {
  return {
    isOpen: false,
    connect: async function () {
      this.isOpen = true;
    },
    disconnect: async function () {
      this.isOpen = false;
    },
    quit: async function () {
      this.isOpen = false;
    },
    on: () => undefined,
    del: async (key: string) => {
      const existed = redisStore.delete(key) ? 1 : 0;
      return existed;
    },
    rPush: async (key: string, value: string) => {
      const items = redisStore.get(key) ?? [];
      items.push(value);
      redisStore.set(key, items);
      return items.length;
    },
    lLen: async (key: string) => redisStore.get(key)?.length ?? 0,
    lRange: async (key: string, start: number, end: number) => {
      const items = redisStore.get(key) ?? [];
      const normalizedEnd = end < 0 ? items.length - 1 : end;
      return items.slice(start, normalizedEnd + 1);
    },
  };
}

jest.mock('redis', () => ({
  createClient: jest.fn(() => createMockClient()),
}));

describe('scheduler enqueue', () => {
  const url = 'redis://mock-local/1';
  let client: MockRedisClient;

  beforeAll(async () => {
    client = createClient({ url }) as unknown as MockRedisClient;
    await client.connect();
    await client.del('jobs:daily_rations');
  });

  afterAll(async () => {
    if (client) await client.disconnect();
    await closeJobQueueRedisClient();
    redisStore.clear();
  });

  test('enqueueDailyRations pushes an item', async () => {
    await enqueueDailyRations(url, 1);
    const len = await client.lLen('jobs:daily_rations');
    expect(len).toBeGreaterThanOrEqual(1);
  }, 10000);
});
