import cron, { ScheduledTask } from 'node-cron';
import { logger } from '../logger/logger.js';
import dailyRationsJob from './daily-rations.job.js';

const DAILY_RATIONS_CRON = process.env.DAILY_RATIONS_CRON ?? '* * * * *';

let dailyRationsTask: ScheduledTask | null = null;

export function startJobScheduler() {
  if (dailyRationsTask) {
    return;
  }

  dailyRationsTask = cron.schedule(DAILY_RATIONS_CRON, async () => {
    logger.info('[JOB] Starting daily rations job');
    await dailyRationsJob.execute();
    logger.info('[JOB] Daily rations job finished');
  });

  logger.info(`[JOB] Daily rations scheduler registered with cron: ${DAILY_RATIONS_CRON}`);
}

export function stopJobScheduler() {
  if (!dailyRationsTask) {
    return;
  }

  dailyRationsTask.stop();
  dailyRationsTask = null;
  logger.info('[JOB] Daily rations scheduler stopped');
}

export default {
  startJobScheduler,
  stopJobScheduler,
};
