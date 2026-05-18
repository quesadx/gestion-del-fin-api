import { Prisma, inventory_log_log_type } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../shared/utils/appError.js';
import { ManualAdjustmentDto } from './inventory.schema.js';
import { logger } from '../../logger/logger.js';
import { getLowResourceAlerts } from '../metrics/metrics.service.js';

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

async function ensureCampExists(tx: InventoryTransactionClient, campId: number) {
  const client = tx as unknown as typeof prisma;
  const camp = await client.camps.findUnique({ where: { id: campId }, select: { id: true } });
  if (!camp) {
    throw new AppError(`Camp not found: ${campId}`, 404);
  }
}

async function ensureResourceExists(tx: InventoryTransactionClient, resourceTypeId: number) {
  const client = tx as unknown as typeof prisma;
  const resource = await client.resource_types.findUnique({
    where: { id: resourceTypeId },
    select: { id: true },
  });

  if (!resource) {
    throw new AppError(`Resource not found: ${resourceTypeId}`, 404);
  }
}

async function ensureUserExists(tx: InventoryTransactionClient, userId: number) {
  const client = tx as unknown as typeof prisma;
  const user = await client.users.findUnique({ where: { id: userId }, select: { id: true } });
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

async function validateInventoryConsistency(campId: number) {
  const inventoryRecords = await prisma.inventories.findMany({
    where: { camp_id: campId },
    select: { resource_type_id: true, quantity: true },
  });

  const logDeltasByResource = await prisma.inventory_logs.groupBy({
    by: ['resource_type_id'],
    where: { camp_id: campId },
    _sum: { quantity_change: true },
  });

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

  const allResourceTypeIds = new Set<number>([...inventoryMap.keys(), ...logMap.keys()]);

  return Array.from(allResourceTypeIds).map((resourceTypeId) => {
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

  const consistency = await validateInventoryConsistency(campId);
  const hasInconsistencies = consistency.some((item) => !item.is_consistent);

  const resourceTypeIds = consistency.map((c) => c.resource_type_id);
  const total = consistency.length;

  const paginatedIds = resourceTypeIds.slice(skip, skip + effectiveLimit);
  const resources = await prisma.resource_types.findMany({
    where: { id: { in: paginatedIds } },
    select: { id: true, name: true, unit: true },
  });

  const resourcesMap = new Map(
    resources.map((r: { id: number; name: string; unit: string }) => [r.id, r]),
  );

  const audit = consistency
    .filter((item) => paginatedIds.includes(item.resource_type_id))
    .map((item) => {
      const resource = resourcesMap.get(item.resource_type_id);
      return {
        resource_type_id: item.resource_type_id,
        resource_name: resource?.name ?? null,
        unit: resource?.unit ?? null,
        inventory_quantity: item.inventory_quantity,
        log_delta_sum: item.log_delta_sum,
        is_consistent: item.is_consistent,
        discrepancy: item.discrepancy,
      };
    });

  return {
    data: audit,
    pagination: {
      page,
      pageSize: effectiveLimit,
      total,
      hasNextPage: page * effectiveLimit < total,
      totalPages: Math.ceil(total / effectiveLimit),
    },
    has_inconsistencies: hasInconsistencies,
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

  return result;
}
