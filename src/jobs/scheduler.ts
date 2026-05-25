import cron, { ScheduledTask } from 'node-cron';
import { logger } from '../logger/logger.js';
import dailyRationsJob from './daily-rations.job.js';
import dailyProductionJob from './daily-production.job.js';
import resourceAlertsJob from './resource-alerts.job.js';
import { createClient, RedisClientType } from 'redis';

const DAILY_RATIONS_CRON = process.env.DAILY_RATIONS_CRON ?? '* * * * *';
const DAILY_PRODUCTION_CRON = process.env.DAILY_PRODUCTION_CRON ?? '0 5 * * *';
const RESOURCE_ALERTS_CRON = process.env.RESOURCE_ALERTS_CRON ?? '0 * * * *';

let dailyRationsTask: ScheduledTask | null = null;
let dailyProductionTask: ScheduledTask | null = null;
let resourceAlertsTask: ScheduledTask | null = null;

export function startJobScheduler() {
  if (dailyRationsTask || dailyProductionTask || resourceAlertsTask) {
    return;
  }

  dailyRationsTask = cron.schedule(DAILY_RATIONS_CRON, async () => {
    logger.info('[JOB] Starting daily rations job');

    try {
      const redisUrl = process.env.REDIS_JOBS_URL;
      if (redisUrl) {
        // enqueue job instead of executing inline
        try {
          await enqueueDailyRations(redisUrl);
          logger.info('[JOB] Daily rations job enqueued');
        } catch (err) {
          logger.error('[JOB] Failed to enqueue daily rations job', err);
        }
      } else {
        await dailyRationsJob.execute();
        logger.info('[JOB] Daily rations job finished');
      }
    } catch (error) {
      logger.error('[JOB] Daily rations job failed', error);
    }
  });

  logger.info(`[JOB] Daily rations scheduler registered with cron: ${DAILY_RATIONS_CRON}`);

  dailyProductionTask = cron.schedule(DAILY_PRODUCTION_CRON, async () => {
    logger.info('[JOB] Starting daily production job');

    try {
      await dailyProductionJob.execute();
      logger.info('[JOB] Daily production job finished');
    } catch (error) {
      logger.error('[JOB] Daily production job failed', error);
    }
  });

  logger.info(`[JOB] Daily production scheduler registered with cron: ${DAILY_PRODUCTION_CRON}`);

  resourceAlertsTask = cron.schedule(RESOURCE_ALERTS_CRON, async () => {
    logger.info('[JOB] Starting resource alerts job');

    try {
      await resourceAlertsJob.execute();
      logger.info('[JOB] Resource alerts job finished');
    } catch (error) {
      logger.error('[JOB] Resource alerts job failed', error);
    }
  });

  logger.info(`[JOB] Resource alerts scheduler registered with cron: ${RESOURCE_ALERTS_CRON}`);
}

let redisClient: RedisClientType | null = null;

async function getRedisClient(url: string): Promise<RedisClientType> {
  if (redisClient) return redisClient;
  redisClient = createClient({ url });
  redisClient.on('error', (e) => logger.warn(`Redis client error: ${String(e)}`));
  await redisClient.connect();
  return redisClient;
}

async function enqueueDailyRations(redisUrl: string, campId?: number) {
  const client = await getRedisClient(redisUrl);
  const payloadObj: Record<string, unknown> = {
    type: 'daily_rations',
    enqueued_at: new Date().toISOString(),
    attempts: 0,
  };
  if (campId !== undefined) payloadObj.campId = campId;
  const payload = JSON.stringify(payloadObj);
  // push to list (RPUSH so workers use BLPOP/BRPOP)
  await client.rPush('jobs:daily_rations', payload);
}

export function stopJobScheduler() {
  if (dailyRationsTask) {
    dailyRationsTask.stop();
    dailyRationsTask = null;
    logger.info('[JOB] Daily rations scheduler stopped');
  }

  if (dailyProductionTask) {
    dailyProductionTask.stop();
    dailyProductionTask = null;
    logger.info('[JOB] Daily production scheduler stopped');
  }

  if (!resourceAlertsTask) {
    return;
  }

  resourceAlertsTask.stop();
  resourceAlertsTask = null;
  logger.info('[JOB] Resource alerts scheduler stopped');
}

export default {
  startJobScheduler,
  stopJobScheduler,
};

export { enqueueDailyRations };
