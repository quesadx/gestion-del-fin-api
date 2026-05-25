import { z } from 'zod';

export const achievementSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100),
  description: z.string().max(255).nullable().optional(),
  icon_url: z.string().url().max(500),
  trigger_rule: z.string().max(100),
  created_at: z.date(),
  updated_at: z.date(),
  deleted_at: z.date().nullable().optional(),
});

export const userAchievementSchema = z.object({
  id: z.number().int().positive(),
  user_id: z.number().int().positive(),
  achievement_id: z.number().int().positive(),
  earned_at: z.date(),
  created_at: z.date(),
});

export const achievementNotificationSchema = z.object({
  id: z.number().int().positive(),
  user_id: z.number().int().positive(),
  achievement_id: z.number().int().positive(),
  notification_sent: z.boolean().default(false),
  sent_at: z.date().nullable().optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

export type Achievement = z.infer<typeof achievementSchema>;
export type UserAchievement = z.infer<typeof userAchievementSchema>;
export type AchievementNotification = z.infer<typeof achievementNotificationSchema>;
