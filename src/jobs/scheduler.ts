import cron, { ScheduledTask } from 'node-cron';
import { logger } from '../logger/logger.js';
import dailyRationsJob from './daily-rations.job.js';
import resourceAlertsJob from './resource-alerts.job.js';

const DAILY_RATIONS_CRON = process.env.DAILY_RATIONS_CRON ?? '* * * * *';
const RESOURCE_ALERTS_CRON = process.env.RESOURCE_ALERTS_CRON ?? '0 * * * *';

let dailyRationsTask: ScheduledTask | null = null;
let resourceAlertsTask: ScheduledTask | null = null;

export function startJobScheduler() {
  if (dailyRationsTask || resourceAlertsTask) {
    return;
  }

  dailyRationsTask = cron.schedule(DAILY_RATIONS_CRON, async () => {
    logger.info('[JOB] Starting daily rations job');
    await dailyRationsJob.execute();
    logger.info('[JOB] Daily rations job finished');
  });

  logger.info(`[JOB] Daily rations scheduler registered with cron: ${DAILY_RATIONS_CRON}`);

  resourceAlertsTask = cron.schedule(RESOURCE_ALERTS_CRON, async () => {
    logger.info('[JOB] Starting resource alerts job');
    await resourceAlertsJob.execute();
    logger.info('[JOB] Resource alerts job finished');
  });

  logger.info(`[JOB] Resource alerts scheduler registered with cron: ${RESOURCE_ALERTS_CRON}`);
}

export function stopJobScheduler() {
  if (dailyRationsTask) {
    dailyRationsTask.stop();
    dailyRationsTask = null;
    logger.info('[JOB] Daily rations scheduler stopped');
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
