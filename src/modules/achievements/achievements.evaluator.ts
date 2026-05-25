import { prisma } from '../../lib/prisma.js';
import { logger } from '../../logger/logger.js';

function getRequiredCount(
  achievementName: string,
  defaultCount: number,
  variants: Record<string, number>,
) {
  for (const [token, count] of Object.entries(variants)) {
    if (achievementName.includes(token)) {
      return count;
    }
  }

  return defaultCount;
}

export const achievementEvaluator = {
  /**
   * Evaluate whether a user meets the condition for a specific achievement
   */
  async evaluate(
    achievement: any,
    userId: number,
    campId: number,
    eventData?: Record<string, any>,
  ): Promise<boolean> {
    const rule = achievement.trigger_rule;

    try {
      switch (rule) {
        case 'LOGIN': {
          // Two kinds of login achievements:
          // - First-login (Novice): unlocked only when caller passes firstLogin=true
          // - Count-based (Consistent Access, Specialist, Command, etc.): unlocked
          //   when the user's total number of LOGIN audit events meets a threshold.

          if (eventData?.firstLogin === true) {
            return achievement.name.includes('Novice');
          }

          // Count LOGIN audit entries for the user as a proxy for number of logins.
          const loginCount = await prisma.audit_logs.count({
            where: { user_id: userId, action: 'LOGIN' },
          });

          const required = getRequiredCount(achievement.name, 1, {
            Novice: 1,
            Consistent: 5,
            Specialist: 15,
            Command: 30,
            'Control Room': 25,
            Night: 3,
          });

          return loginCount >= required;
        }

        case 'CAMP_CREATE':
          // Count created camps
          const camps = await prisma.camps.count({
            where: { deleted_at: null },
          });
          const required = getRequiredCount(achievement.name, 1, {
            Manager: 2,
            Multi: 3,
            Crisis: 1,
            Shelter: 2,
            Network: 3,
          });
          return camps >= required;

        case 'EXPEDITION_RETURN': {
          // Count returned expeditions
          const expeditions = await prisma.expeditions.count({
            where: {
              camp_id: campId,
              status: 'RETURNED',
            },
          });
          const required = getRequiredCount(achievement.name, 1, {
            Brave: 3,
            Pathfinder: 3,
            Captain: 4,
            Guardian: 2,
          });
          return expeditions >= required;
        }

        case 'TRANSFER_COMPLETE': {
          // Count completed transfers
          const transfers = await prisma.camp_transfers.count({
            where: {
              requesting_camp: campId,
              status: 'COMPLETED',
            },
          });
          const required = getRequiredCount(achievement.name, 1, {
            Diplomat: 3,
            Route: 2,
            Command: 4,
            Master: 5,
          });
          return transfers >= required;
        }

        case 'INVENTORY_ADJUST': {
          // Count inventory adjustments
          const adjusts = await prisma.inventory_logs.count({
            where: {
              logged_by: userId,
              log_type: { in: ['MANUAL_IN', 'MANUAL_OUT'] },
            },
          });
          const required = getRequiredCount(achievement.name, 1, {
            Novice: 1,
            Keeper: 3,
            Guardian: 5,
            Sentinel: 5,
            Counter: 4,
          });
          return adjusts >= required;
        }

        case 'EXPEDITION_FOUND_RESOURCES': {
          // Sum resources found in expeditions
          const resources = await prisma.expedition_found_resources.aggregate({
            where: {
              expeditions: {
                camp_id: campId,
              },
            },
            _sum: { amount: true },
          });
          const total = Number(resources._sum.amount ?? 0);
          return total >= 100;
        }

        case 'HEALTH_DAYS': {
          // Verify consecutive healthy days (approximate)
          const healthyCount = await prisma.people.count({
            where: {
              camp_id: campId,
              status: 'HEALTHY',
            },
          });
          // Fallback: at least one healthy person is a good signal
          return healthyCount > 0;
        }

        case 'PERIODIC_CHECK':
          // For periodic checks, always true (job implements logic)
          return true;

        default:
          logger.warn(`Unknown trigger rule: ${rule} for achievement ${achievement.id}`);
          return false;
      }
    } catch (error) {
      logger.error(`Error evaluating achievement condition: ${(error as Error).message}`);
      return false;
    }
  },
};
