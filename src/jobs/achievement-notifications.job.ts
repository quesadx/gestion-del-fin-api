import { logger } from '../logger/logger.js';
import { achievementNotifier } from '../modules/achievements/achievements.notifier.js';

export async function execute() {
  logger.info('[JOB] Starting achievement notifications job');

  try {
    await achievementNotifier.sendPendingNotifications();
    logger.info('[JOB] Achievement notifications job finished');
  } catch (error) {
    logger.error('[JOB] Achievement notifications job failed', error);
  }
}

export default { execute };
