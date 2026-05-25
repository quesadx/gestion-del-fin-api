import { Prisma, inventory_log_log_type } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../shared/utils/appError.js';
import { ManualAdjustmentDto } from './inventory.schema.js';
import { logger } from '../../logger/logger.js';
import { getLowResourceAlerts } from '../metrics/metrics.service.js';
import { auditLog } from '../../shared/utils/auditLog.js';

function asNumber(value: unknown): number {
  return Number(value);
}

type InventoryTransactionClient = Prisma.TransactionClient;

type InventoryConsumptionResult = {
  consumed: number;
  remaining: number;
};

type InventoryGainResult = {
  gained: number;
  remaining: number;
};

type InventoryLogOptions = {
  logAlerts?: boolean;
};

// PrismaClientLike accepts both the global prisma client (used outside transactions)
// and the Prisma.TransactionClient (used inside $transaction callbacks).
type PrismaClientLike = typeof prisma | InventoryTransactionClient;

async function ensureCampExists(tx: PrismaClientLike, campId: number) {
  const camp = await tx.camps.findUnique({ where: { id: campId }, select: { id: true } });
  if (!camp) {
    throw new AppError(`Camp not found: ${campId}`, 404);
  }
}

async function ensureResourceExists(tx: InventoryTransactionClient, resourceTypeId: number) {
  const resource = await tx.resource_types.findUnique({
    where: { id: resourceTypeId },
    select: { id: true },
  });

  if (!resource) {
    throw new AppError(`Resource not found: ${resourceTypeId}`, 404);
  }
}

async function ensureUserExists(tx: InventoryTransactionClient, userId: number) {
  const user = await tx.users.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) {
    throw new AppError(`User not found: ${userId}`, 404);
  }
}

export async function logLowResourceAlerts(campId: number) {
  try {
    const alerts = await getLowResourceAlerts(campId);

    for (const alert of alerts) {
      const message = ` [INVENTORY] Camp ${campId}: ${alert.status} alert for ${alert.resource_name} (${alert.quantity_current}/${alert.quantity_min_threshold})`;

      if (alert.status === 'CRITICAL') {
        logger.error(message);
      } else {
        logger.warn(message);
      }
    }
  } catch (error) {
    logger.error(` [INVENTORY] Failed to evaluate low stock alerts for camp ${campId}`);
    logger.error(error);
  }
}

/**
 * Collects all distinct resource_type_ids across inventories and inventory_logs
 * for a given camp. Returns the sorted array of IDs (lightweight, just integers).
 */
async function getDistinctResourceTypeIdsForCamp(campId: number): Promise<number[]> {
  const [inventoryIds, logIds] = await Promise.all([
    prisma.inventories.findMany({
      where: { camp_id: campId },
      select: { resource_type_id: true },
      distinct: ['resource_type_id'],
    }),
    prisma.inventory_logs.findMany({
      where: { camp_id: campId },
      select: { resource_type_id: true },
      distinct: ['resource_type_id'],
    }),
  ]);

  const idSet = new Set<number>([
    ...inventoryIds.map((r: { resource_type_id: number }) => r.resource_type_id),
    ...logIds.map((r: { resource_type_id: number }) => r.resource_type_id),
  ]);

  return Array.from(idSet).sort((a, b) => a - b);
}

/**
 * Computes consistency between inventory snapshots and log deltas for the given
 * resource_type_ids. Pagination is pushed to the database level — only the requested
 * IDs are queried.
 */
async function validateInventoryConsistency(
  campId: number,
  resourceTypeIds: number[],
): Promise<
  Array<{
    resource_type_id: number;
    inventory_quantity: number;
    log_delta_sum: number;
    is_consistent: boolean;
    discrepancy: number;
  }>
> {
  if (resourceTypeIds.length === 0) {
    return [];
  }

  const [inventoryRecords, logDeltasByResource] = await Promise.all([
    prisma.inventories.findMany({
      where: { camp_id: campId, resource_type_id: { in: resourceTypeIds } },
      select: { resource_type_id: true, quantity: true },
    }),
    prisma.inventory_logs.groupBy({
      by: ['resource_type_id'],
      where: { camp_id: campId, resource_type_id: { in: resourceTypeIds } },
      _sum: { quantity_change: true },
    }),
  ]);

  const inventoryMap = new Map(
    inventoryRecords.map((inv: { resource_type_id: number; quantity: Prisma.Decimal }) => [
      inv.resource_type_id,
      asNumber(inv.quantity),
    ]),
  );

  const logMap = new Map(
    logDeltasByResource.map(
      (row: { resource_type_id: number; _sum: { quantity_change: Prisma.Decimal | null } }) => [
        row.resource_type_id,
        asNumber(row._sum.quantity_change ?? 0),
      ],
    ),
  );

  return resourceTypeIds.map((resourceTypeId) => {
    const inventoryQty = inventoryMap.get(resourceTypeId) ?? 0;
    const logSum = logMap.get(resourceTypeId) ?? 0;
    const isConsistent = Math.abs(inventoryQty - logSum) < 0.01; // tolerance for decimals

    return {
      resource_type_id: resourceTypeId,
      inventory_quantity: inventoryQty,
      log_delta_sum: logSum,
      is_consistent: isConsistent,
      discrepancy: inventoryQty - logSum,
    };
  });
}

export async function consumeInventoryWithLog(
  campId: number,
  resourceTypeId: number,
  quantity: number,
  description: string,
  options: InventoryLogOptions = {},
): Promise<InventoryConsumptionResult> {
  if (quantity <= 0) {
    throw new AppError('Quantity must be greater than 0', 400);
  }

  const result = await prisma.$transaction(async (tx: InventoryTransactionClient) => {
    const client = tx as unknown as typeof prisma;
    const now = new Date();

    const updateResult = await client.inventories.updateMany({
      where: {
        camp_id: campId,
        resource_type_id: resourceTypeId,
        quantity: { gte: quantity },
      },
      data: {
        quantity: { decrement: quantity },
        last_updated: now,
      },
    });

    if (updateResult.count === 0) {
      throw new AppError(
        `Insufficient inventory for resource_type_id ${resourceTypeId} in camp ${campId}`,
        400,
      );
    }

    const movement = await client.inventory_logs.create({
      data: {
        camp_id: campId,
        resource_type_id: resourceTypeId,
        log_type: inventory_log_log_type.DAILY_RATION,
        quantity_change: -quantity,
        description,
      },
      select: { quantity_change: true },
    });

    const currentInventory = await client.inventories.findUnique({
      where: {
        camp_id_resource_type_id: {
          camp_id: campId,
          resource_type_id: resourceTypeId,
        },
      },
      select: { quantity: true },
    });

    return {
      consumed: -Number(movement.quantity_change),
      remaining: Number(currentInventory?.quantity ?? 0),
    };
  });

  if (options.logAlerts ?? true) {
    await logLowResourceAlerts(campId);
  }

  return result;
}

export async function increaseInventoryWithLog(
  campId: number,
  resourceTypeId: number,
  quantity: number,
  description: string,
  options: InventoryLogOptions = {},
): Promise<InventoryGainResult> {
  if (quantity <= 0) {
    throw new AppError('Quantity must be greater than 0', 400);
  }

  const result = await prisma.$transaction(async (tx: InventoryTransactionClient) => {
    const client = tx as unknown as typeof prisma;
    const now = new Date();

    const updateResult = await client.inventories.updateMany({
      where: {
        camp_id: campId,
        resource_type_id: resourceTypeId,
      },
      data: {
        quantity: { increment: quantity },
        last_updated: now,
      },
    });

    if (updateResult.count === 0) {
      await client.inventories.create({
        data: {
          camp_id: campId,
          resource_type_id: resourceTypeId,
          quantity,
          last_updated: now,
        },
      });
    }

    const movement = await client.inventory_logs.create({
      data: {
        camp_id: campId,
        resource_type_id: resourceTypeId,
        log_type: inventory_log_log_type.DAILY_GAIN,
        quantity_change: quantity,
        description,
      },
      select: { quantity_change: true },
    });

    const currentInventory = await client.inventories.findUnique({
      where: {
        camp_id_resource_type_id: {
          camp_id: campId,
          resource_type_id: resourceTypeId,
        },
      },
      select: { quantity: true },
    });

    return {
      gained: Number(movement.quantity_change),
      remaining: Number(currentInventory?.quantity ?? 0),
    };
  });

  if (options.logAlerts ?? true) {
    await logLowResourceAlerts(campId);
  }

  return result;
}

export async function getCampInventory(campId: number, page = 1, pageSize = 20) {
  await ensureCampExists(prisma, campId);

  const effectiveLimit = Math.min(pageSize, 100);
  const skip = (page - 1) * effectiveLimit;

  const [total, inventoryRecords] = await Promise.all([
    prisma.inventories.count({ where: { camp_id: campId } }),
    prisma.inventories.findMany({
      where: { camp_id: campId },
      skip,
      take: effectiveLimit,
      select: {
        resource_type_id: true,
        quantity: true,
        created_at: true,
        deleted_at: true,
        resource_type: {
          select: {
            id: true,
            name: true,
            unit: true,
            minimum_stock: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    }),
  ]);

  const inventory = inventoryRecords
    .map(
      (row: {
        resource_type_id: number;
        quantity: Prisma.Decimal;
        created_at: Date;
        deleted_at: Date | null;
        resource_type: {
          id: number;
          name: string;
          unit: string;
          minimum_stock: Prisma.Decimal;
          created_at: Date;
          updated_at: Date;
          deleted_at: Date | null;
        };
      }) => {
        const quantity = asNumber(row.quantity);
        const minimumStock = asNumber(row.resource_type.minimum_stock);

        return {
          resource_type_id: row.resource_type_id,
          resource_name: row.resource_type.name,
          unit: row.resource_type.unit,
          quantity,
          minimum_stock: minimumStock,
          is_below_minimum: quantity < minimumStock,
          created_at: row.created_at,
          deleted_at: row.deleted_at,
          resource_type: {
            id: row.resource_type.id,
            name: row.resource_type.name,
            unit: row.resource_type.unit,
            minimum_stock: minimumStock,
            created_at: row.resource_type.created_at,
            updated_at: row.resource_type.updated_at,
            deleted_at: row.resource_type.deleted_at,
          },
        };
      },
    )
    .sort((a: { resource_name: string }, b: { resource_name: string }) =>
      a.resource_name.localeCompare(b.resource_name),
    );

  return {
    data: inventory,
    pagination: {
      page,
      pageSize: effectiveLimit,
      total,
      hasNextPage: page * effectiveLimit < total,
      totalPages: Math.ceil(total / effectiveLimit),
    },
  };
}

export async function getInventoryAudit(campId: number, page = 1, pageSize = 20) {
  await ensureCampExists(prisma, campId);

  const effectiveLimit = Math.min(pageSize, 100);
  const skip = (page - 1) * effectiveLimit;

  const [total, logs] = await Promise.all([
    prisma.inventory_logs.count({ where: { camp_id: campId } }),
    prisma.inventory_logs.findMany({
      where: { camp_id: campId },
      skip,
      take: effectiveLimit,
      orderBy: { logged_at: 'desc' },
      select: {
        id: true,
        camp_id: true,
        resource_type_id: true,
        logged_by: true,
        log_type: true,
        quantity_change: true,
        logged_at: true,
        created_at: true,
        description: true,
        resource_type: {
          select: { id: true, name: true, unit: true },
        },
        users: {
          select: { username: true },
        },
      },
    }),
  ]);

  const audit = logs.map(
    (row: {
      id: number;
      camp_id: number;
      resource_type_id: number;
      logged_by: number | null;
      log_type: inventory_log_log_type;
      quantity_change: Prisma.Decimal;
      logged_at: Date;
      created_at: Date;
      description: string | null;
      resource_type: { id: number; name: string; unit: string };
      users: { username: string } | null;
    }) => ({
      id: row.id,
      camp_id: row.camp_id,
      resource_type_id: row.resource_type_id,
      type: row.log_type,
      log_type: row.log_type,
      quantity: asNumber(row.quantity_change),
      description: row.description,
      created_at: row.logged_at,
      timestamp: row.logged_at,
      user_id: row.logged_by,
      user: row.users ? { username: row.users.username } : undefined,
      username: row.users?.username,
      resource_name: row.resource_type.name,
      unit: row.resource_type.unit,
      resource: {
        name: row.resource_type.name,
      },
    }),
  );

  return {
    data: audit,
    pagination: {
      page,
      pageSize: effectiveLimit,
      total,
      hasNextPage: page * effectiveLimit < total,
      totalPages: Math.ceil(total / effectiveLimit),
    },
  };
}

export async function createManualAdjustment(data: ManualAdjustmentDto, userId: number) {
  const result = await prisma.$transaction(async (tx: InventoryTransactionClient) => {
    const client = tx as unknown as typeof prisma;
    await Promise.all([
      ensureCampExists(tx, data.camp_id),
      ensureResourceExists(tx, data.resource_type_id),
      ensureUserExists(tx, userId),
    ]);

    const now = new Date();
    const isManualIn = data.type === 'MANUAL_IN';
    const quantityChange = isManualIn ? data.quantity : -data.quantity;

    if (isManualIn) {
      await client.inventories.upsert({
        where: {
          camp_id_resource_type_id: {
            camp_id: data.camp_id,
            resource_type_id: data.resource_type_id,
          },
        },
        update: {
          quantity: { increment: data.quantity },
          last_updated: now,
        },
        create: {
          camp_id: data.camp_id,
          resource_type_id: data.resource_type_id,
          quantity: data.quantity,
          last_updated: now,
        },
      });
    } else {
      const updateResult = await client.inventories.updateMany({
        where: {
          camp_id: data.camp_id,
          resource_type_id: data.resource_type_id,
          quantity: { gte: data.quantity },
        },
        data: {
          quantity: { decrement: data.quantity },
          last_updated: now,
        },
      });

      if (updateResult.count === 0) {
        throw new AppError(
          `Insufficient inventory for resource_type_id ${data.resource_type_id} in camp ${data.camp_id}`,
          400,
        );
      }
    }

    const movement = await client.inventory_logs.create({
      data: {
        camp_id: data.camp_id,
        resource_type_id: data.resource_type_id,
        logged_by: userId,
        log_type: data.type,
        quantity_change: quantityChange,
        description: data.description?.trim(),
      },
      select: {
        id: true,
        camp_id: true,
        resource_type_id: true,
        logged_by: true,
        log_type: true,
        quantity_change: true,
        logged_at: true,
        created_at: true,
        description: true,
      },
    });

    const currentInventory = await client.inventories.findUnique({
      where: {
        camp_id_resource_type_id: {
          camp_id: data.camp_id,
          resource_type_id: data.resource_type_id,
        },
      },
      select: {
        quantity: true,
        last_updated: true,
        created_at: true,
        deleted_at: true,
      },
    });

    return {
      movement: {
        ...movement,
        quantity_change: asNumber(movement.quantity_change),
      },
      inventory: {
        camp_id: data.camp_id,
        resource_type_id: data.resource_type_id,
        quantity: asNumber(currentInventory?.quantity ?? 0),
        last_updated: currentInventory?.last_updated ?? now,
        created_at: currentInventory?.created_at ?? now,
        deleted_at: currentInventory?.deleted_at ?? null,
      },
    };
  });

  await logLowResourceAlerts(data.camp_id);

  auditLog({
    userId,
    campId: data.camp_id,
    action: 'MANUAL_INVENTORY_ADJUST',
    targetType: 'inventory_logs',
    targetId: result.movement.id,
  });

  return result;
}
