import { createClient, RedisClientType } from 'redis';
import { logger } from '../logger/logger.js';

const DAILY_RATIONS_QUEUE = 'jobs:daily_rations';
const DAILY_PRODUCTION_QUEUE = 'jobs:daily_production';
const RESOURCE_ALERTS_QUEUE = 'jobs:resource_alerts';

let redisClient: RedisClientType | null = null;

async function getRedisClient(url: string): Promise<RedisClientType> {
  if (redisClient) return redisClient;
  redisClient = createClient({ url });
  redisClient.on('error', (e) => logger.warn(`Redis client error: ${String(e)}`));
  await redisClient.connect();
  return redisClient;
}

export async function enqueueJob(redisUrl: string, queue: string, type: string, campId?: number) {
  const client = await getRedisClient(redisUrl);
  const payloadObj: Record<string, unknown> = {
    type,
    queue,
    enqueued_at: new Date().toISOString(),
    attempts: 0,
  };
  if (campId !== undefined) payloadObj.campId = campId;
  await client.rPush(queue, JSON.stringify(payloadObj));
}

export async function enqueueDailyRations(redisUrl: string, campId?: number) {
  await enqueueJob(redisUrl, DAILY_RATIONS_QUEUE, 'daily_rations', campId);
}

export async function enqueueDailyProduction(redisUrl: string, campId?: number) {
  await enqueueJob(redisUrl, DAILY_PRODUCTION_QUEUE, 'daily_production', campId);
}

export async function enqueueResourceAlerts(redisUrl: string, campId?: number) {
  await enqueueJob(redisUrl, RESOURCE_ALERTS_QUEUE, 'resource_alerts', campId);
}

export async function closeJobQueueRedisClient() {
  if (!redisClient) return;

  const client = redisClient;
  redisClient = null;

  if (client.isOpen) {
    await client.quit();
  } else {
    await client.disconnect();
  }
}
