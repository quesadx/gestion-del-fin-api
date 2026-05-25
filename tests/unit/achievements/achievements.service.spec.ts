import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockPrisma: any = {
  users: { findUnique: jest.fn(), update: jest.fn() },
  achievements: { findMany: jest.fn(), create: jest.fn() },
  user_achievements: { create: jest.fn(), findMany: jest.fn() },
  achievement_roles: { createMany: jest.fn() },
  achievement_stats: { create: jest.fn() },
  roles: { findUnique: jest.fn() },
};

const mockEvaluate: any = jest.fn();
const mockNotifyUnlock: any = jest.fn();

jest.mock('../../../src/lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('../../../src/logger/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));
jest.mock('../../../src/modules/achievements/achievements.evaluator', () => ({
  achievementEvaluator: {
    evaluate: mockEvaluate,
  },
}));
jest.mock('../../../src/modules/achievements/achievements.notifier', () => ({
  achievementNotifier: {
    notifyUnlock: mockNotifyUnlock,
  },
}));

import {
  createAchievement,
  getAchievementStatsByRole,
  tryUnlock,
} from '../../../src/modules/achievements/achievements.service';

describe('achievements.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('tryUnlock creates a user achievement and triggers notification', async () => {
    mockPrisma.users.findUnique.mockResolvedValueOnce({ id: 7, role_id: 2 });
    mockPrisma.achievements.findMany.mockResolvedValueOnce([
      {
        id: 11,
        name: 'Login Novice',
        icon_url: 'https://example.com/icon.png',
        trigger_rule: 'LOGIN',
        user_achievements: [],
      },
    ]);
    mockEvaluate.mockResolvedValueOnce(true);
    mockPrisma.user_achievements.create.mockResolvedValueOnce({
      earned_at: new Date('2026-05-25T00:00:00Z'),
    });
    mockNotifyUnlock.mockResolvedValueOnce(undefined);

    const result = await tryUnlock(7, 3, 'LOGIN');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      achievementId: 11,
      name: 'Login Novice',
      icon_url: 'https://example.com/icon.png',
    });
    expect(mockPrisma.user_achievements.create).toHaveBeenCalledWith({
      data: {
        user_id: 7,
        achievement_id: 11,
      },
    });
    expect(mockNotifyUnlock).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ id: 11, name: 'Login Novice' }),
    );
  });

  test('tryUnlock skips already unlocked achievements', async () => {
    mockPrisma.users.findUnique.mockResolvedValueOnce({ id: 7, role_id: 2 });
    mockPrisma.achievements.findMany.mockResolvedValueOnce([
      {
        id: 11,
        name: 'Login Novice',
        icon_url: 'https://example.com/icon.png',
        trigger_rule: 'LOGIN',
        user_achievements: [{ id: 99 }],
      },
    ]);

    const result = await tryUnlock(7, 3, 'LOGIN');

    expect(result).toEqual([]);
    expect(mockEvaluate).not.toHaveBeenCalled();
    expect(mockPrisma.user_achievements.create).not.toHaveBeenCalled();
  });

  test('getAchievementStatsByRole resolves role by name', async () => {
    mockPrisma.roles.findUnique.mockResolvedValueOnce({ id: 4, name: 'worker' });
    mockPrisma.achievements.findMany.mockResolvedValueOnce([]);

    await getAchievementStatsByRole('worker');

    expect(mockPrisma.roles.findUnique).toHaveBeenCalledWith({ where: { name: 'worker' } });
  });

  test('createAchievement creates stats and role mappings', async () => {
    mockPrisma.achievements.create.mockResolvedValueOnce({ id: 21, name: 'New Badge' });
    mockPrisma.achievement_roles.createMany.mockResolvedValueOnce({ count: 2 });
    mockPrisma.achievement_stats.create.mockResolvedValueOnce({ id: 1 });

    const result = await createAchievement({
      name: 'New Badge',
      description: 'A brand new badge',
      icon_url: 'https://example.com/new.png',
      trigger_rule: 'LOGIN',
      roleIds: [1, 2],
    });

    expect(result).toMatchObject({ id: 21, name: 'New Badge' });
    expect(mockPrisma.achievement_roles.createMany).toHaveBeenCalledWith({
      data: [
        { achievement_id: 21, role_id: 1 },
        { achievement_id: 21, role_id: 2 },
      ],
    });
    expect(mockPrisma.achievement_stats.create).toHaveBeenCalledWith({
      data: { achievement_id: 21, total_unlocks: 0 },
    });
  });
});
