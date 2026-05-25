import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockPrisma: any = {
  camps: { count: jest.fn() },
  expeditions: { count: jest.fn() },
  camp_transfers: { count: jest.fn() },
  inventory_logs: { count: jest.fn() },
  expedition_found_resources: { aggregate: jest.fn() },
  people: { count: jest.fn() },
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

import { achievementEvaluator } from '../../../src/modules/achievements/achievements.evaluator';

describe('achievementEvaluator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('matches camp creation thresholds by achievement name', async () => {
    mockPrisma.camps.count.mockResolvedValueOnce(3);

    const result = await achievementEvaluator.evaluate(
      { id: 1, trigger_rule: 'CAMP_CREATE', name: 'Network Builder' },
      10,
      20,
    );

    expect(result).toBe(true);
    expect(mockPrisma.camps.count).toHaveBeenCalledWith({ where: { deleted_at: null } });
  });

  test('rejects inventory achievements when the user has not reached the threshold', async () => {
    mockPrisma.inventory_logs.count.mockResolvedValueOnce(2);

    const result = await achievementEvaluator.evaluate(
      { id: 2, trigger_rule: 'INVENTORY_ADJUST', name: 'Ledger Guardian' },
      10,
      20,
    );

    expect(result).toBe(false);
    expect(mockPrisma.inventory_logs.count).toHaveBeenCalledWith({
      where: {
        logged_by: 10,
        log_type: { in: ['MANUAL_IN', 'MANUAL_OUT'] },
      },
    });
  });

  test('returns true for periodic checks', async () => {
    const result = await achievementEvaluator.evaluate(
      { id: 3, trigger_rule: 'PERIODIC_CHECK', name: 'Stable Ledger' },
      10,
      20,
    );

    expect(result).toBe(true);
  });
});
