import { prisma } from '../../lib/prisma.js';
import { achievementEvaluator } from './achievements.evaluator.js';
import { achievementNotifier } from './achievements.notifier.js';
import { AppError } from '../../shared/utils/appError.js';
import { handleUniqueConstraintError } from '../../shared/utils/handlePrismaError.js';
import { logger } from '../../logger/logger.js';

export interface AchievementUnlockResult {
  achievementId: number;
  name: string;
  icon_url: string;
  earned_at: Date;
}

/**
 * Attempt to unlock achievements for a user
 * This function is failure-safe - individual errors do not block other evaluations
 */
export async function tryUnlock(
  userId: number,
  campId: number,
  triggerRule: string,
  eventData?: Record<string, any>,
): Promise<AchievementUnlockResult[]> {
  const unlocked: AchievementUnlockResult[] = [];

  try {
    // Validate user exists
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, role_id: true },
    });

    if (!user) {
      logger.warn(`Achievement check: User ${userId} not found`);
      return [];
    }

    // Fetch applicable achievements for this user's role and trigger
    const applicableAchievements = await prisma.achievements.findMany({
      where: {
        trigger_rule: triggerRule,
        deleted_at: null,
        achievement_roles: {
          some: { role_id: user.role_id },
        },
      },
      include: {
        user_achievements: {
          where: { user_id: userId },
          select: { id: true },
        },
      },
    });

    // Process each achievement
    for (const achievement of applicableAchievements) {
      try {
        // Skip if already unlocked
        if (achievement.user_achievements.length > 0) {
          continue;
        }

        // Evaluate condition
        const isConditionMet = await achievementEvaluator.evaluate(
          achievement,
          userId,
          campId,
          eventData,
        );

        if (isConditionMet) {
          // Unlock achievement
          const userAchievement = await prisma.user_achievements.create({
            data: {
              user_id: userId,
              achievement_id: achievement.id,
            },
          });

          unlocked.push({
            achievementId: achievement.id,
            name: achievement.name,
            icon_url: achievement.icon_url,
            earned_at: userAchievement.earned_at,
          });

          // Notify (do not block if it fails)
          achievementNotifier.notifyUnlock(userId, achievement).catch((err: unknown) => {
            logger.warn(
              `Failed to notify achievement unlock: ${err instanceof Error ? err.message : String(err)}`,
            );
          });
        }
      } catch (achievementError) {
        // Log and continue with next achievement
        logger.error(
          `Error evaluating achievement ${achievement.id}: ${(achievementError as Error).message}`,
        );
        continue;
      }
    }

    return unlocked;
  } catch (error: unknown) {
    logger.error(
      `Achievement check failed for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
    );
    // Do not throw; main operation must not be affected
    return [];
  }
}

/**
 * Get achievements unlocked by a user
 */
export async function getUserAchievements(userId: number) {
  return prisma.user_achievements.findMany({
    where: { user_id: userId },
    include: { achievements: true },
    orderBy: { earned_at: 'desc' },
  });
}

/**
 * Get achievement statistics for a role
 */
export async function getAchievementStatsByRole(roleName: string) {
  const role = await prisma.roles.findUnique({ where: { name: roleName } });
  if (!role) return [];

  return prisma.achievements.findMany({
    where: {
      deleted_at: null,
      achievement_roles: {
        some: { role_id: role.id },
      },
    },
    select: {
      id: true,
      name: true,
      description: true,
      icon_url: true,
      trigger_rule: true,
      _count: {
        select: {
          user_achievements: true,
        },
      },
    },
  });
}

/**
 * List all achievements
 */
export async function listAchievements() {
  return prisma.achievements.findMany({
    where: { deleted_at: null },
    select: {
      id: true,
      name: true,
      description: true,
      icon_url: true,
      trigger_rule: true,
      achievement_roles: {
        select: { roles: { select: { id: true, name: true } } },
      },
    },
    orderBy: { name: 'asc' },
  });
}

/**
 * Create an achievement (admin)
 */
export async function createAchievement(data: {
  name: string;
  description?: string;
  icon_url: string;
  trigger_rule: string;
  roleIds?: number[];
}) {
  try {
    const achievement = await prisma.achievements.create({
      data: {
        name: data.name,
        description: data.description,
        icon_url: data.icon_url,
        trigger_rule: data.trigger_rule,
      },
    });

    // Link with roles if provided
    if (data.roleIds && data.roleIds.length > 0) {
      await prisma.achievement_roles.createMany({
        data: data.roleIds.map((roleId) => ({
          achievement_id: achievement.id,
          role_id: roleId,
        })),
      });
    }

    // Create stats entry
    await prisma.achievement_stats.create({
      data: {
        achievement_id: achievement.id,
        total_unlocks: 0,
      },
    });

    return achievement;
  } catch (error: unknown) {
    handleUniqueConstraintError(error);
  }
}
