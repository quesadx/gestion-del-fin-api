import cron, { ScheduledTask } from 'node-cron';
import { logger } from '../logger/logger.js';
import dailyRationsJob from './daily-rations.job.js';
import dailyProductionJob from './daily-production.job.js';
import resourceAlertsJob from './resource-alerts.job.js';
import achievementNotificationsJob from './achievement-notifications.job.js';
import {
  enqueueDailyProduction,
  enqueueDailyRations,
  enqueueResourceAlerts,
  enqueueCleanupExpiredTokens,
} from './job-queue.js';

const DAILY_RATIONS_CRON = process.env.DAILY_RATIONS_CRON ?? '* * * * *';
const DAILY_PRODUCTION_CRON = process.env.DAILY_PRODUCTION_CRON ?? '0 5 * * *';
const RESOURCE_ALERTS_CRON = process.env.RESOURCE_ALERTS_CRON ?? '0 * * * *';
const CLEANUP_TOKENS_CRON = process.env.CLEANUP_TOKENS_CRON ?? '0 3 * * *';
const ACHIEVEMENT_NOTIFICATIONS_CRON = process.env.ACHIEVEMENT_NOTIFICATIONS_CRON ?? '*/30 * * * *';
let dailyRationsTask: ScheduledTask | null = null;
let dailyProductionTask: ScheduledTask | null = null;
let resourceAlertsTask: ScheduledTask | null = null;
let cleanupTokensTask: ScheduledTask | null = null;
let achievementNotificationsTask: ScheduledTask | null = null;

export function startJobScheduler() {
  if (
    dailyRationsTask ||
    dailyProductionTask ||
    resourceAlertsTask ||
    cleanupTokensTask ||
    achievementNotificationsTask
  ) {
    return;
  }

  dailyRationsTask = cron.schedule(DAILY_RATIONS_CRON, async () => {
    logger.info('[JOB] Starting daily rations job');

    try {
      const valkeyUrl = process.env.VALKEY_JOBS_URL;
      if (valkeyUrl) {
        try {
          await enqueueDailyRations(valkeyUrl);
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
      const valkeyUrl = process.env.VALKEY_JOBS_URL;
      if (valkeyUrl) {
        try {
          await enqueueDailyProduction(valkeyUrl);
          logger.info('[JOB] Daily production job enqueued');
        } catch (err) {
          logger.error('[JOB] Failed to enqueue daily production job', err);
        }
      } else {
        await dailyProductionJob.execute();
        logger.info('[JOB] Daily production job finished');
      }
    } catch (error) {
      logger.error('[JOB] Daily production job failed', error);
    }
  });

  logger.info(`[JOB] Daily production scheduler registered with cron: ${DAILY_PRODUCTION_CRON}`);

  resourceAlertsTask = cron.schedule(RESOURCE_ALERTS_CRON, async () => {
    logger.info('[JOB] Starting resource alerts job');

    try {
      const valkeyUrl = process.env.VALKEY_JOBS_URL;
      if (valkeyUrl) {
        try {
          await enqueueResourceAlerts(valkeyUrl);
          logger.info('[JOB] Resource alerts job enqueued');
        } catch (err) {
          logger.error('[JOB] Failed to enqueue resource alerts job', err);
        }
      } else {
        await resourceAlertsJob.execute();
        logger.info('[JOB] Resource alerts job finished');
      }
    } catch (error) {
      logger.error('[JOB] Resource alerts job failed', error);
    }
  });

  logger.info(`[JOB] Resource alerts scheduler registered with cron: ${RESOURCE_ALERTS_CRON}`);

  cleanupTokensTask = cron.schedule(CLEANUP_TOKENS_CRON, async () => {
    logger.info('[JOB] Starting cleanup expired tokens job');

    try {
      const valkeyUrl = process.env.VALKEY_JOBS_URL;
      if (valkeyUrl) {
        await enqueueCleanupExpiredTokens(valkeyUrl);
        logger.info('[JOB] Cleanup expired tokens job enqueued');
      } else {
        logger.info('[JOB] No Valkey URL configured, skipping cleanup tokens enqueue');
      }
    } catch (error) {
      logger.error('[JOB] Cleanup expired tokens job failed', error);
    }
  });

  logger.info(
    `[JOB] Cleanup expired tokens scheduler registered with cron: ${CLEANUP_TOKENS_CRON}`,
  );

  achievementNotificationsTask = cron.schedule(ACHIEVEMENT_NOTIFICATIONS_CRON, async () => {
    logger.info('[JOB] Starting achievement notifications job');

    try {
      await achievementNotificationsJob.execute();
    } catch (error) {
      logger.error('[JOB] Achievement notifications job failed', error);
    }
  });

  logger.info(
    `[JOB] Achievement notifications scheduler registered with cron: ${ACHIEVEMENT_NOTIFICATIONS_CRON}`,
  );
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

  if (resourceAlertsTask) {
    resourceAlertsTask.stop();
    resourceAlertsTask = null;
    logger.info('[JOB] Resource alerts scheduler stopped');
  }

  if (cleanupTokensTask) {
    cleanupTokensTask.stop();
    cleanupTokensTask = null;
    logger.info('[JOB] Cleanup expired tokens scheduler stopped');
  }

  if (achievementNotificationsTask) {
    achievementNotificationsTask.stop();
    achievementNotificationsTask = null;
    logger.info('[JOB] Achievement notifications scheduler stopped');
  }
}

export default {
  startJobScheduler,
  stopJobScheduler,
};

export {
  enqueueDailyRations,
  enqueueDailyProduction,
  enqueueResourceAlerts,
  enqueueCleanupExpiredTokens,
} from './job-queue.js';
