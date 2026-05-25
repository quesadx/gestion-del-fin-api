import { prisma } from '../../lib/prisma.js';
import { logger } from '../../logger/logger.js';

export const achievementNotifier = {
  /**
   * Notify that an achievement was unlocked
   */
  async notifyUnlock(userId: number, achievement: any) {
    try {
      // 1. Create notification record in DB
      await prisma.achievement_notifications.create({
        data: {
          user_id: userId,
          achievement_id: achievement.id,
          notification_sent: false,
        },
      });

      // 2. Create audit log
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { camp_id: true },
      });

      if (user) {
        await prisma.audit_logs.create({
          data: {
            user_id: userId,
            camp_id: user.camp_id,
            action: 'ACHIEVEMENT_UNLOCKED',
            target_type: 'achievements',
            target_id: achievement.id,
            metadata: {
              achievement_name: achievement.name,
              achievement_icon: achievement.icon_url,
              trigger_rule: achievement.trigger_rule,
            },
          },
        });
      }

      // 3. Update statistics
      await prisma.achievement_stats.upsert({
        where: { achievement_id: achievement.id },
        create: {
          achievement_id: achievement.id,
          total_unlocks: 1,
          last_unlock_at: new Date(),
        },
        update: {
          total_unlocks: { increment: 1 },
          last_unlock_at: new Date(),
        },
      });

      logger.info(
        `Achievement unlocked: ${achievement.name} (ID: ${achievement.id}) for user ${userId}`,
      );

      // 4. TODO: Emit WebSocket event for real-time notification
      // await eventBus.emit('achievement:unlocked', { userId, achievement });
    } catch (error) {
      logger.error(`Failed to notify achievement unlock: ${(error as Error).message}`);
      // Do not rethrow - should not affect main operation
    }
  },

  /**
   * Send pending notifications (periodic job)
   */
  async sendPendingNotifications() {
    try {
      const pending = await prisma.achievement_notifications.findMany({
        where: { notification_sent: false },
        include: {
          achievements: true,
          users: { select: { username: true } },
        },
        take: 100,
      });

      logger.info(`Sending ${pending.length} pending achievement notifications`);

      for (const notification of pending) {
        try {
          // TODO: Send via email, WebSocket, etc.
          // For now just mark as sent
          await prisma.achievement_notifications.update({
            where: { id: notification.id },
            data: {
              notification_sent: true,
              sent_at: new Date(),
            },
          });

          logger.debug(`Notification sent for achievement: ${notification.achievements.name}`);
        } catch (error) {
          logger.error(
            `Failed to send notification for achievement ${notification.achievement_id}: ${error}`,
          );
        }
      }
    } catch (error) {
      logger.error(`Failed in sendPendingNotifications: ${(error as Error).message}`);
    }
  },
};
