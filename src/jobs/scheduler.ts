import cron, { ScheduledTask } from 'node-cron';
import { logger } from '../logger/logger.js';
import dailyRationsJob from './daily-rations.job.js';
import dailyProductionJob from './daily-production.job.js';
import resourceAlertsJob from './resource-alerts.job.js';

const DAILY_RATIONS_CRON = process.env.DAILY_RATIONS_CRON ?? '* * * * *';
const DAILY_PRODUCTION_CRON = process.env.DAILY_PRODUCTION_CRON ?? '0 5 * * *';
const RESOURCE_ALERTS_CRON = process.env.RESOURCE_ALERTS_CRON ?? '0 * * * *';

let dailyRationsTask: ScheduledTask | null = null;
let dailyProductionTask: ScheduledTask | null = null;
let resourceAlertsTask: ScheduledTask | null = null;

// Concurrency guards — node-cron does not prevent overlapping executions.
// Without these guards, overlapping cron runs can cause inventory race
// conditions (e.g., multiple invocations reading the same stale snapshot).
let dailyRationsRunning = false;
let dailyProductionRunning = false;
let resourceAlertsRunning = false;

export function startJobScheduler() {
  if (dailyRationsTask || dailyProductionTask || resourceAlertsTask) {
    return;
  }

  dailyRationsTask = cron.schedule(DAILY_RATIONS_CRON, async () => {
    if (dailyRationsRunning) {
      logger.warn('[JOB] Daily rations already running, skipping');
      return;
    }
    dailyRationsRunning = true;
    logger.info('[JOB] Starting daily rations job');

    try {
      await dailyRationsJob.execute();
      logger.info('[JOB] Daily rations job finished');
    } catch (error) {
      logger.error('[JOB] Daily rations job failed', error);
    } finally {
      dailyRationsRunning = false;
    }
  });

  logger.info(`[JOB] Daily rations scheduler registered with cron: ${DAILY_RATIONS_CRON}`);

  dailyProductionTask = cron.schedule(DAILY_PRODUCTION_CRON, async () => {
    if (dailyProductionRunning) {
      logger.warn('[JOB] Daily production already running, skipping');
      return;
    }
    dailyProductionRunning = true;
    logger.info('[JOB] Starting daily production job');

    try {
      await dailyProductionJob.execute();
      logger.info('[JOB] Daily production job finished');
    } catch (error) {
      logger.error('[JOB] Daily production job failed', error);
    } finally {
      dailyProductionRunning = false;
    }
  });

  logger.info(`[JOB] Daily production scheduler registered with cron: ${DAILY_PRODUCTION_CRON}`);

  resourceAlertsTask = cron.schedule(RESOURCE_ALERTS_CRON, async () => {
    if (resourceAlertsRunning) {
      logger.warn('[JOB] Resource alerts already running, skipping');
      return;
    }
    resourceAlertsRunning = true;
    logger.info('[JOB] Starting resource alerts job');

    try {
      await resourceAlertsJob.execute();
      logger.info('[JOB] Resource alerts job finished');
    } catch (error) {
      logger.error('[JOB] Resource alerts job failed', error);
    } finally {
      resourceAlertsRunning = false;
    }
  });

  logger.info(`[JOB] Resource alerts scheduler registered with cron: ${RESOURCE_ALERTS_CRON}`);
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
