import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockPrisma: any = {
  achievement_notifications: { create: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  audit_logs: { create: jest.fn() },
  users: { findUnique: jest.fn() },
  achievement_stats: { upsert: jest.fn() },
};

jest.mock('../../../src/lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('../../../src/logger/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { achievementNotifier } from '../../../src/modules/achievements/achievements.notifier';

describe('achievementNotifier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('notifyUnlock creates notification, audit log, and stats record', async () => {
    mockPrisma.users.findUnique.mockResolvedValueOnce({ camp_id: 44 });
    mockPrisma.achievement_notifications.create.mockResolvedValueOnce({ id: 1 });
    mockPrisma.audit_logs.create.mockResolvedValueOnce({ id: 2 });
    mockPrisma.achievement_stats.upsert.mockResolvedValueOnce({ id: 3 });

    await achievementNotifier.notifyUnlock(7, {
      id: 11,
      name: 'Login Novice',
      icon_url: 'https://example.com/icon.png',
      trigger_rule: 'LOGIN',
    });

    expect(mockPrisma.achievement_notifications.create).toHaveBeenCalledWith({
      data: {
        user_id: 7,
        achievement_id: 11,
        notification_sent: false,
      },
    });
    expect(mockPrisma.audit_logs.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user_id: 7,
        camp_id: 44,
        action: 'ACHIEVEMENT_UNLOCKED',
        target_type: 'achievements',
        target_id: 11,
      }),
    });
    expect(mockPrisma.achievement_stats.upsert).toHaveBeenCalledWith({
      where: { achievement_id: 11 },
      create: {
        achievement_id: 11,
        total_unlocks: 1,
        last_unlock_at: expect.any(Date),
      },
      update: {
        total_unlocks: { increment: 1 },
        last_unlock_at: expect.any(Date),
      },
    });
  });

  test('sendPendingNotifications marks pending notifications as sent', async () => {
    mockPrisma.achievement_notifications.findMany.mockResolvedValueOnce([
      {
        id: 5,
        achievement_id: 11,
        achievements: { name: 'Login Novice' },
        users: { username: 'alice' },
      },
    ]);
    mockPrisma.achievement_notifications.update.mockResolvedValueOnce({ id: 5 });

    await achievementNotifier.sendPendingNotifications();

    expect(mockPrisma.achievement_notifications.findMany).toHaveBeenCalledWith({
      where: { notification_sent: false },
      include: {
        achievements: true,
        users: { select: { username: true } },
      },
      take: 100,
    });
    expect(mockPrisma.achievement_notifications.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: {
        notification_sent: true,
        sent_at: expect.any(Date),
      },
    });
  });
});
